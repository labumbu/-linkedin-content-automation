import { NextRequest, NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"
import { generatePosts, resolveProvider, AIProvider } from "@/lib/ai"

const EXTRACT_PROMPT = (content: string) => `Analyze this LinkedIn post and return metadata about it.

Post:
"""
${content}
"""

Return ONLY a valid JSON object with these fields:
- hook_text: string — the exact first line of the post
- hook_type: string — one of: "statistic" | "question" | "contrarian" | "bold_claim" | "pattern_interrupt" | "story"
- tone: string — one of: "Direct & Bold" | "Data-Driven" | "Contrarian" | "Storytelling" | "HOW TO" | "WHAT TO"
- format: string — one of: "text_only" | "list" | "story" | "stats_heavy" | "how_to"
- why_it_works: string — exactly 2 sentences. Sentence 1: identify the specific psychological or structural mechanism (e.g. "Opens with a counterintuitive statistic that violates the reader's existing belief, forcing a pattern interrupt"). Sentence 2: explain the structural choice that amplifies it (e.g. "The numbered list then delivers the payoff in scannable steps, rewarding the curiosity gap opened by the hook"). Be specific — never write vague statements like "this post is engaging because it tells a story."
- topic_tags: string[] — 3-5 keywords describing the subject matter (e.g. ["outbound", "AI SDR", "pipeline", "B2B"])

Return ONLY the JSON object. No preamble, no markdown.`

export async function POST(req: NextRequest) {
  const { content } = await req.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 })
  }

  const settings = await getSettings()
  const provider = resolveProvider(settings?.ai_provider as AIProvider)

  try {
    const text = await generatePosts("You are a LinkedIn content analyst.", EXTRACT_PROMPT(content), provider)
    const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()
    const match = stripped.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("No JSON in response")
    const result = JSON.parse(match[0])
    return NextResponse.json(result)
  } catch (err) {
    console.error("Extract metadata error:", err)
    return NextResponse.json({ error: "Failed to extract metadata" }, { status: 500 })
  }
}
