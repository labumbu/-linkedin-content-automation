import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"
import { Trend } from "@/lib/types"
import { fetchRedditPosts, RedditPost } from "@/lib/reddit"
import { supabase } from "@/lib/supabase/client"

const client = new Anthropic()

async function getWebSearchTrends(): Promise<Trend[]> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    tools: [{ type: "web_search_20250305", name: "web_search" } as any],
    messages: [
      {
        role: "user",
        content: `Search for the top 6 trending topics RIGHT NOW in AI sales, B2B sales technology, and sales automation in 2026.

Search for topics related to: AI SDRs, signal-based selling, sales copilot tools, conversation intelligence, outbound automation, LinkedIn for B2B sales, revenue operations.

After searching, return ONLY a JSON array of exactly 6 trend objects:
[
  {
    "id": "ws-1",
    "title": "Short punchy title (max 8 words)",
    "summary": "2-3 sentence summary of why this is trending and why it matters for B2B sales teams",
    "source": "Web Search",
    "relevanceScore": 8,
    "velocity": "hot"
  }
]

Rules:
- id must be prefixed with "ws-" (e.g. "ws-1", "ws-2")
- source must be "Web Search"
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
  if (!jsonMatch) throw new Error("No JSON array in web search response")
  return JSON.parse(jsonMatch[0])
}

async function getRedditTrends(posts: RedditPost[]): Promise<Trend[]> {
  if (posts.length === 0) return []

  const postList = posts
    .map((p, i) => `${i + 1}. [r/${p.subreddit}] "${p.title}" (${p.score} upvotes, ${p.num_comments} comments)${p.selftext ? `\n   Context: ${p.selftext}` : ""}`)
    .join("\n\n")

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Analyze these trending Reddit posts from B2B sales and startup communities and identify the top 4 most relevant trends for AI-powered B2B sales teams:

${postList}

Return ONLY a JSON array of 4 trend objects. Each object must include a "sourceIndex" field (1-based index of the Reddit post it maps to):
[
  {
    "id": "rd-1",
    "sourceIndex": 1,
    "title": "Short punchy trend title (max 8 words)",
    "summary": "2-3 sentence summary of the trend signal and why it matters for B2B sales",
    "source": "Reddit",
    "relevanceScore": 7,
    "velocity": "rising"
  }
]

Rules:
- id must be prefixed with "rd-"
- source must be "Reddit"
- relevanceScore is 0-10 based on relevance to AI-powered B2B sales
- velocity must be: "hot", "rising", or "stable"
- sourceIndex links the trend back to the original Reddit post for engagement metrics
- Return ONLY the JSON array, no other text`,
      },
    ],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  const raw = JSON.parse(jsonMatch[0])

  // Attach engagement metrics from source Reddit post
  return raw.map((t: any) => {
    const sourcePost = posts[t.sourceIndex - 1]
    return {
      id: t.id,
      title: t.title,
      summary: t.summary,
      source: t.source,
      relevanceScore: t.relevanceScore,
      velocity: t.velocity,
      upvotes: sourcePost?.score,
      comments: sourcePost?.num_comments,
    } as Trend
  })
}

async function saveTrends(trends: Trend[]) {
  const rows = trends.map((t) => ({
    title: t.title,
    summary: t.summary,
    source: t.source,
    relevance_score: t.relevanceScore,
    velocity: t.velocity,
    upvotes: t.upvotes ?? null,
    comments: t.comments ?? null,
  }))

  await supabase.from("trends").insert(rows)
}

export async function GET() {
  try {
    const redditPosts = await fetchRedditPosts().catch(() => [])

    const [webTrends, redditTrends] = await Promise.allSettled([
      getWebSearchTrends(),
      getRedditTrends(redditPosts),
    ])

    const trends: Trend[] = [
      ...(webTrends.status === "fulfilled" ? webTrends.value : []),
      ...(redditTrends.status === "fulfilled" ? redditTrends.value : []),
    ]

    if (trends.length === 0) {
      return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 })
    }

    // Save to Supabase in background (don't block response)
    saveTrends(trends).catch(console.error)

    return NextResponse.json({ trends })
  } catch (error) {
    console.error("Trends API error:", error)
    return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 })
  }
}
