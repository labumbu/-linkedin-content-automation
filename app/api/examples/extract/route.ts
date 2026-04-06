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
- why_it_works: string — 2-3 sentences explaining the specific mechanism that makes this post effective (hook strategy, structural choice, psychological trigger)
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
