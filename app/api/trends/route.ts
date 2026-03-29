import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"
import { Trend } from "@/lib/types"

const client = new Anthropic()

export async function GET() {
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      tools: [{ type: "web_search_20250305", name: "web_search" } as any],
      messages: [
        {
          role: "user",
          content: `Search for the top 8 trending topics RIGHT NOW in AI sales, B2B sales technology, and sales automation in 2026.

Search for topics related to: AI SDRs, signal-based selling, sales copilot tools, conversation intelligence, outbound automation, LinkedIn for B2B sales, revenue operations.

After searching, return ONLY a JSON array of exactly 8 trend objects:
[
  {
    "id": "1",
    "title": "Short punchy title (max 8 words)",
    "summary": "2-3 sentence summary of why this is trending and why it matters for B2B sales teams",
    "source": "Web Search",
    "relevanceScore": 8,
    "velocity": "hot"
  }
]

Rules:
- source must be one of: "Web Search", "Twitter", "Reddit", "LinkedIn"
- relevanceScore is 0-10 based on relevance to AI-powered B2B sales
- velocity must be: "hot", "rising", or "stable"
- Return ONLY the JSON array, no other text`,
        },
      ],
    })

    let jsonText = ""
    for (const block of response.content) {
      if (block.type === "text") {
        jsonText = block.text
        break
      }
    }

    const jsonMatch = jsonText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error("No JSON array in response")

    const trends: Trend[] = JSON.parse(jsonMatch[0])
    return NextResponse.json({ trends })
  } catch (error) {
    console.error("Trends API error:", error)
    return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 })
  }
}
