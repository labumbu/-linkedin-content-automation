import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import { getSettings, getKnowledgeBase, buildSystemPrompt } from "@/lib/settings"
import { generatePosts, resolveProvider, AIProvider } from "@/lib/ai"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { DigestResult } from "@/lib/types"

function getWeekRange(weekStart?: string | null): { start: Date; end: Date; label: string } {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  if (weekStart) {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    end.setHours(23, 59, 59, 999)
    return { start, end, label: `${fmt(start)} – ${fmt(end)}` }
  }
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 7)
  start.setHours(0, 0, 0, 0)
  return { start, end: now, label: `${fmt(start)} – ${fmt(now)}` }
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s
}

function inferPublication(url?: string | null): string {
  if (!url) return "Unknown"
  try {
    const host = new URL(url).hostname.replace("www.", "")
    const map: Record<string, string> = {
      "gartner.com": "Gartner", "forrester.com": "Forrester", "mckinsey.com": "McKinsey",
      "hbr.org": "Harvard Business Review", "wsj.com": "Wall Street Journal",
      "techcrunch.com": "TechCrunch", "venturebeat.com": "VentureBeat",
      "forbes.com": "Forbes", "bloomberg.com": "Bloomberg", "saastr.com": "SaaStr",
      "salesforce.com": "Salesforce Blog", "hubspot.com": "HubSpot",
      "reddit.com": "Reddit", "redd.it": "Reddit",
    }
    for (const [domain, name] of Object.entries(map)) {
      if (host.includes(domain)) return name
    }
    return host.split(".")[0].charAt(0).toUpperCase() + host.split(".")[0].slice(1)
  } catch {
    return "Unknown"
  }
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(getRateLimitKey(req, "digest"), 3, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rl.retryAfterSeconds} seconds.` },
      { status: 429 }
    )
  }

  const encoder = new TextEncoder()
  const send = (controller: ReadableStreamDefaultController, data: object) => {
    controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"))
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. Fetch trends for the requested week from Supabase
        const weekStart = req.nextUrl.searchParams.get("weekStart")
        const { start, end, label: weekLabel } = getWeekRange(weekStart)
        const { data: trends, error } = await supabase
          .from("trends")
          .select("*")
          .gte("found_at", start.toISOString())
          .lte("found_at", end.toISOString())
          .order("found_at", { ascending: false })
          .limit(200)

        if (error) throw new Error("Failed to fetch trends: " + error.message)

        const allTrends = trends ?? []
        const webTrends = allTrends.filter((t) => t.source !== "Reddit")
        const redditTrends = allTrends.filter((t) => t.source === "Reddit")

        const totalComments = redditTrends.reduce((s, t) => s + (t.comments ?? 0), 0)
        const totalUpvotes = redditTrends.reduce((s, t) => s + (t.upvotes ?? 0), 0)

        send(controller, {
          type: "progress",
          stage: "fetching",
          message: `Found ${webTrends.length} web articles + ${redditTrends.length} Reddit posts`,
        })

        if (allTrends.length === 0) {
          send(controller, { type: "error", message: "No trends found for this period. Try a different week or refresh the dashboard first." })
          controller.close()
          return
        }

        // 2. Load Harvey context
        const [settings, knowledgeItems] = await Promise.all([getSettings(), getKnowledgeBase()])
        const provider = resolveProvider(settings?.ai_provider as AIProvider)
        const systemPrompt = settings ? await buildSystemPrompt(settings, knowledgeItems) : ""

        send(controller, { type: "progress", stage: "synthesizing", message: "Synthesizing web findings…" })

        // 3. Build context strings
        const webContext = webTrends
          .map((t) => `• [${inferPublication(t.source_url)}] ${t.title}: ${truncate(t.summary ?? "", 200)}${t.source_url ? ` (${t.source_url})` : ""}`)
          .join("\n")

        const redditContext = redditTrends
          .map((t) => `• r/${t.source_url?.match(/reddit\.com\/r\/([^/]+)/)?.[1] ?? "reddit"} | ${t.upvotes ?? 0} upvotes, ${t.comments ?? 0} comments — "${t.title}": ${truncate(t.summary ?? "", 200)}`)
          .join("\n")

        // 4. Three parallel AI calls
        const webPrompt = `You are analyzing ${webTrends.length} web news items from this week about AI in B2B sales, outreach, and revenue operations.

NEWS ITEMS:
${webContext}

Synthesize into a structured intelligence report. Return ONLY valid JSON:
{
  "headline": "bold 8-12 word claim summarizing the biggest finding this week",
  "keyFindings": ["5-8 specific findings, each with a concrete data point, percentage, or named company/product"],
  "trendingTopics": ["3-5 short topic labels (2-4 words each)"],
  "notableStats": ["up to 6 specific numbers, percentages, or dollar amounts extracted from the news"],
  "sources": [{ "title": "article title", "url": "source url", "publication": "publication name" }]
}

Return ONLY the JSON object. No markdown, no explanation.`

        const redditPrompt = `You are analyzing ${redditTrends.length} Reddit posts from B2B sales, SaaS, and startup subreddits this week.

REDDIT POSTS (format: subreddit | upvotes, comments — title: summary):
${redditContext || "No Reddit posts found this week."}

Extract community intelligence. Return ONLY valid JSON:
{
  "headline": "bold 8-12 word claim about what practitioners are actually saying this week",
  "communityPainPoints": ["4-6 specific pain points that practitioners are complaining about or struggling with — be specific, not generic"],
  "topDiscussions": [
    { "title": "post title (truncated to 80 chars)", "upvotes": 0, "comments": 0, "url": "reddit url or empty string" }
  ],
  "sentiment": "positive | neutral | negative | mixed",
  "keyInsights": ["3-5 surprising or actionable insights from community discussions — things you wouldn't get from analyst reports"]
}

Include top 5 discussions by engagement. Return ONLY the JSON object.`

        const harveyPrompt = `Harvey is an AI copilot for B2B sales teams that closes the full loop: prospecting, outreach, follow-up, and pipeline management in one place. Harvey's competitors: Salesloft, Apollo, Clay, Lemlist.

This week's market findings:
WEB: ${webTrends.slice(0, 5).map((t) => t.title).join("; ")}
REDDIT PAIN POINTS: practitioners struggling with AI adoption, outreach personalization, pipeline visibility (inferred from ${redditTrends.length} posts)

Based on these market findings, explain how Harvey directly addresses each trend and pain point. Return ONLY valid JSON:
{
  "headline": "bold statement of Harvey's relevance to this week's market movements (8-12 words)",
  "relevancePoints": ["4-6 specific points connecting Harvey's capabilities to specific findings from the news/reddit. Be concrete — name the specific trend and the specific Harvey feature that addresses it."],
  "callToAction": "one compelling sentence inviting B2B sales leaders to explore Harvey"
}`

        const [webRaw, redditRaw, harveyRaw] = await Promise.all([
          generatePosts(systemPrompt, webPrompt, provider).catch(() => "{}"),
          generatePosts(systemPrompt, redditPrompt, provider).catch(() => "{}"),
          generatePosts(systemPrompt, harveyPrompt, provider).catch(() => "{}"),
        ])

        send(controller, { type: "progress", stage: "reddit", message: "Analyzing Reddit pulse…" })

        // Parse AI results
        const parseJson = (raw: string, fallback: object) => {
          try {
            const match = raw.match(/\{[\s\S]*\}/)
            return match ? JSON.parse(match[0]) : fallback
          } catch {
            return fallback
          }
        }

        const webSynthesis = parseJson(webRaw, {
          headline: "AI is reshaping B2B sales this week",
          keyFindings: webTrends.slice(0, 6).map((t) => t.title),
          trendingTopics: ["AI Sales", "B2B Outreach", "Pipeline AI"],
          notableStats: [],
          sources: webTrends.slice(0, 8).filter((t) => t.source_url).map((t) => ({
            title: t.title,
            url: t.source_url,
            publication: inferPublication(t.source_url),
          })),
        })

        const redditPulse = parseJson(redditRaw, {
          headline: "Practitioners are debating AI adoption in sales",
          communityPainPoints: redditTrends.slice(0, 5).map((t) => t.title),
          topDiscussions: redditTrends.slice(0, 5).map((t) => ({
            title: t.title,
            upvotes: t.upvotes ?? 0,
            comments: t.comments ?? 0,
            url: t.source_url ?? "",
          })),
          sentiment: "mixed",
          keyInsights: [],
        })

        const harveyAngle = parseJson(harveyRaw, {
          headline: "Harvey addresses this week's biggest B2B sales challenges",
          relevancePoints: ["Harvey automates the full sales loop — from prospecting to pipeline management"],
          callToAction: "See how Harvey can transform your B2B sales workflow.",
        })

        send(controller, { type: "progress", stage: "harvey", message: "Building Harvey angle…" })

        // 5. LinkedIn post
        const linkedinPrompt = `Write a single LinkedIn post about this week's B2B sales & AI market intelligence report.

Key findings this week:
${webSynthesis.keyFindings?.slice(0, 4).join("\n") ?? "AI is changing B2B sales"}

Reddit community pulse: ${redditPulse.headline}

Harvey angle: ${harveyAngle.headline}

Rules:
- First 1-2 lines = killer hook (6-10 words, use a specific number or bold claim from the findings)
- Short paragraphs, sentences under 12 words
- Data-driven and direct
- End with a specific provocative question that generates 15+ word replies
- 3-5 relevant hashtags on the last line
- 700-1000 characters total

Return ONLY the post text. No explanation, no JSON.`

        const linkedinPost = await generatePosts(systemPrompt, linkedinPrompt, provider).catch(() => "")

        const digest: DigestResult = {
          weekRange: weekLabel,
          generatedAt: new Date().toISOString(),
          webCount: webTrends.length,
          redditCount: redditTrends.length,
          totalComments,
          totalUpvotes,
          webSynthesis,
          redditPulse,
          harveyAngle,
          linkedinPost: linkedinPost.trim(),
        }

        // Save to Supabase (best-effort — don't block the stream if table doesn't exist yet)
        let digestId: string | null = null
        try {
          const { data: saved } = await supabase
            .from("digests")
            .insert({
              week_range: digest.weekRange,
              generated_at: digest.generatedAt,
              web_count: digest.webCount,
              reddit_count: digest.redditCount,
              headline: digest.webSynthesis.headline,
              digest_json: digest,
            })
            .select("id")
            .single()
          digestId = saved?.id ?? null
        } catch {
          // table may not exist yet — silently skip
        }

        send(controller, { type: "complete", digest, digestId })
        controller.close()
      } catch (err) {
        console.error("Digest API error:", err)
        send(controller, { type: "error", message: "Digest generation failed. Please try again." })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Transfer-Encoding": "chunked" },
  })
}
