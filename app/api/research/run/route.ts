import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { DATA_EXTRACTION_PROMPT, SOURCE_RANKING_PROMPT, SYNTHESIS_SYSTEM_PROMPT } from "@/lib/research-prompts"
import { DataPoint, EvidenceDensity, ReportJSON, TierSourceCount } from "@/lib/research-types"
import { getSettings } from "@/lib/settings"

// Vercel Pro required for full 5-stage pipeline (~30–60s)
export const maxDuration = 60

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

// Resolves which provider to actually use (same logic as lib/ai/index.ts)
function resolveProvider(requested: "anthropic" | "openai"): "anthropic" | "openai" {
  if (requested === "anthropic" && !process.env.ANTHROPIC_API_KEY) return "openai"
  if (requested === "openai" && !process.env.OPENAI_API_KEY) return "anthropic"
  return requested
}

// ── Provider-agnostic AI calls ─────────────────────────────────────────────

async function aiComplete(provider: "anthropic" | "openai", prompt: string, systemPrompt?: string, maxTokens = 2048): Promise<string> {
  if (provider === "openai") {
    const messages: any[] = []
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt })
    messages.push({ role: "user", content: prompt })
    const res = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      max_tokens: maxTokens,
      messages,
    })
    return res.choices[0]?.message?.content ?? ""
  } else {
    const res = await getAnthropic().messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: maxTokens,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: [{ role: "user", content: prompt }],
    })
    return res.content[0].type === "text" ? res.content[0].text : ""
  }
}

async function aiWebSearch(provider: "anthropic" | "openai", topic: string, queries: string[]): Promise<{ url: string; title: string }[]> {
  const queryList = queries.map((q, i) => `${i + 1}. ${q}`).join("\n")
  const prompt = `Search for research and data on this topic: "${topic}"\n\nRun searches using these queries:\n${queryList}\n\nFind sources from analyst firms (Gartner, Forrester, McKinsey), vendor research reports, and credible trade press. Focus on quantitative data and statistics.`

  if (provider === "openai") {
    const res = await getOpenAI().responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search_preview" } as any],
      input: prompt,
    } as any)

    const results: { url: string; title: string }[] = []
    for (const item of (res as any).output ?? []) {
      if (item.type === "web_search_call") {
        for (const r of item.results ?? []) {
          if (r.url) results.push({ url: r.url, title: r.title ?? "" })
        }
      }
    }
    // Also parse URLs from output_text if web_search_call results are empty
    if (results.length === 0) {
      const text: string = (res as any).output_text ?? ""
      const urlMatches = text.matchAll(/https?:\/\/[^\s"')]+/g)
      for (const m of urlMatches) results.push({ url: m[0], title: "" })
    }
    return results
  } else {
    const res = await getAnthropic().messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      tools: [{ type: "web_search_20250305", name: "web_search" } as any],
      messages: [{ role: "user", content: prompt }],
    })

    const results: { url: string; title: string }[] = []
    for (const block of res.content) {
      if ((block as any).type === "web_search_tool_result") {
        for (const r of (block as any).content ?? []) {
          if (r.url) results.push({ url: r.url, title: r.title ?? "" })
        }
      }
    }
    return results
  }
}

// ── Utilities ──────────────────────────────────────────────────────────────

function computeRecommendedPages(tierSourceCount: number, dataPoints: number): 2 | 3 | 4 | 5 {
  if (tierSourceCount >= 5 && dataPoints >= 40) return 5
  if (tierSourceCount >= 3 && dataPoints >= 25) return 4
  if (tierSourceCount >= 2 && dataPoints >= 15) return 3
  return 2
}

function computeRecommendedSections(pages: 2 | 3 | 4 | 5): string[] {
  if (pages === 2) return ["executive_summary"]
  if (pages === 3) return ["executive_summary", "evidence_section", "conclusion"]
  if (pages === 4) return ["executive_summary", "comparison_section", "evidence_section", "conclusion"]
  return ["executive_summary", "comparison_section", "evidence_section", "gap_section", "conclusion"]
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

async function fetchArticleContent(url: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HarveyResearch/1.0)" },
    })
    clearTimeout(timeout)
    if (!res.ok) return ""
    const html = await res.text()
    return stripHtml(html).slice(0, 8000)
  } catch {
    return ""
  }
}

function getCurrentMonthYear(): string {
  return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

// ── Main route ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { topic } = await req.json()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"))
      }

      try {
        // Load settings to determine provider
        const settings = await getSettings()
        const provider = resolveProvider((settings?.ai_provider ?? "anthropic") as "anthropic" | "openai")

        // ── Stage 1: Generate search queries ──────────────────────────────
        const queryText = await aiComplete(provider,
          `Generate 5 distinct search queries for researching this topic: "${topic}"\n\nEach query should target a different angle: market data, adoption stats, ROI evidence, case studies, analyst reports.\n\nReturn ONLY a valid JSON array of 5 query strings. No preamble.`,
          undefined, 512
        )

        const queryClean = queryText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()
        const queryMatch = queryClean.match(/\[[\s\S]*\]/)
        if (!queryMatch) throw new Error("Stage 1: No JSON array in query response")
        const searchQueries: string[] = JSON.parse(queryMatch[0])

        send({ type: "stage_complete", stage: 1, message: `Generated ${searchQueries.length} search queries` })

        // ── Stage 2: Multi-search ──────────────────────────────────────────
        const searchResults = await aiWebSearch(provider, topic, searchQueries)

        // Deduplicate by URL
        const seen = new Set<string>()
        const uniqueResults = searchResults.filter(r => {
          if (seen.has(r.url)) return false
          seen.add(r.url)
          return true
        })

        send({ type: "stage_complete", stage: 2, message: `Found ${uniqueResults.length} unique sources` })

        // ── Stage 3: Source ranking + evidence density ─────────────────────
        const rankingMsg = `Research topic: "${topic}"\n\nRate the credibility of these sources:\n${uniqueResults.map((r, i) => `${i + 1}. ${r.url} — "${r.title}"`).join("\n")}\n\n${SOURCE_RANKING_PROMPT}`

        const rankText = await aiComplete(provider, rankingMsg, undefined, 2048)
        const rankClean = rankText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()
        const rankMatch = rankClean.match(/\[[\s\S]*\]/)
        if (!rankMatch) throw new Error("Stage 3: No JSON array in ranking response")

        const rankedSources: { url: string; tier: 1 | 2 | 3 | 4; score: number; source_name: string; reason: string }[] = JSON.parse(rankMatch[0])

        const tier12 = rankedSources.filter(s => s.tier <= 2).sort((a, b) => a.tier - b.tier || b.score - a.score)
        const tier3 = rankedSources.filter(s => s.tier === 3).sort((a, b) => b.score - a.score)
        const top6 = [...tier12, ...tier3].slice(0, 6)

        const tier1Count = tier12.filter(s => s.tier === 1).length
        const tier2Count = tier12.filter(s => s.tier === 2).length
        const tier3Count = rankedSources.filter(s => s.tier === 3).length

        const tierSources: TierSourceCount[] = []
        if (tier1Count > 0) tierSources.push({ tier: 1, count: tier1Count, urls: tier12.filter(s => s.tier === 1).map(s => s.url) })
        if (tier2Count > 0) tierSources.push({ tier: 2, count: tier2Count, urls: tier12.filter(s => s.tier === 2).map(s => s.url) })
        if (tier3Count > 0) tierSources.push({ tier: 3, count: tier3Count, urls: tier3.map(s => s.url) })

        const initialPages = computeRecommendedPages(tier12.length, 0)
        const evidenceDensityV1: EvidenceDensity = {
          tier_sources: tierSources,
          total_data_points: 0,
          tier1_data_points: 0,
          tier2_data_points: 0,
          recommended_pages: initialPages,
          recommended_sections: computeRecommendedSections(initialPages),
        }

        send({ type: "stage_complete", stage: 3, message: `Ranked sources — ${tier12.length} Tier 1+2 found` })
        send({ type: "evidence_assessed", evidence_density: evidenceDensityV1 })

        // ── Stage 4: Fetch articles + extract data points ──────────────────
        const fetchedContents = await Promise.all(
          top6.map(async (source) => {
            const content = await fetchArticleContent(source.url)
            return { source, content }
          })
        )

        const successfulFetches = fetchedContents.filter(f => f.content.length > 100)

        const extractionResults = await Promise.all(
          successfulFetches.map(async ({ source, content }) => {
            try {
              const extractText = await aiComplete(provider,
                `Research topic: "${topic}"\n\nArticle URL: ${source.url}\n\n${DATA_EXTRACTION_PROMPT}\n\nArticle content:\n${content}`,
                undefined, 1024
              )
              const extractMatch = extractText.match(/\[[\s\S]*\]/)
              if (!extractMatch) return []
              return JSON.parse(extractMatch[0]) as DataPoint[]
            } catch {
              return []
            }
          })
        )

        const allDataPoints: DataPoint[] = extractionResults
          .flat()
          .filter(dp => dp.tier && dp.tier <= 3)

        const tier1DataPoints = allDataPoints.filter(dp => dp.tier === 1).length
        const tier2DataPoints = allDataPoints.filter(dp => dp.tier === 2).length
        const tier12DataPoints = tier1DataPoints + tier2DataPoints

        const finalPages = computeRecommendedPages(tier12.length, tier12DataPoints)
        const evidenceDensityFinal: EvidenceDensity = {
          ...evidenceDensityV1,
          total_data_points: allDataPoints.length,
          tier1_data_points: tier1DataPoints,
          tier2_data_points: tier2DataPoints,
          recommended_pages: finalPages,
          recommended_sections: computeRecommendedSections(finalPages),
        }

        send({
          type: "stage_complete",
          stage: 4,
          message: `Extracted ${allDataPoints.length} data points from ${successfulFetches.length} sources`,
        })

        // ── Stage 5: Synthesis ─────────────────────────────────────────────
        const accessedDate = getCurrentMonthYear()
        const synthesisUserMsg = `Research topic: "${topic}"
Current date for "accessed" fields: ${accessedDate}
Number of search queries run: ${searchQueries.length}
Number of sources fetched: ${successfulFetches.length}

Evidence density:
${JSON.stringify(evidenceDensityFinal, null, 2)}

Sections to include: ${evidenceDensityFinal.recommended_sections.join(", ")}

Extracted data points (${allDataPoints.length} total):
${JSON.stringify(allDataPoints, null, 2)}`

        const synthesisText = await aiComplete(provider, synthesisUserMsg, SYNTHESIS_SYSTEM_PROMPT, 8192)

        let report: ReportJSON
        try {
          // Strip markdown code fences if present (GPT-4o wraps in ```json ... ```)
          const stripped = synthesisText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()
          const jsonMatch = stripped.match(/\{[\s\S]*\}/)
          if (!jsonMatch) throw new Error(`No JSON object found. Raw response (first 500 chars): ${synthesisText.slice(0, 500)}`)
          report = JSON.parse(jsonMatch[0])
        } catch (parseErr) {
          throw new Error(`Stage 5 parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`)
        }

        send({ type: "stage_complete", stage: 5, message: "Report synthesised" })
        send({ type: "synthesis_complete", report })

        controller.close()
      } catch (error) {
        console.error("Research pipeline error:", error)
        send({ type: "error", message: error instanceof Error ? error.message : "Research pipeline failed" })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Transfer-Encoding": "chunked" },
  })
}
