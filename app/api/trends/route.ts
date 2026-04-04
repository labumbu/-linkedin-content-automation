import { NextResponse } from "next/server"
import { Trend } from "@/lib/types"
import { fetchRedditPosts, RedditPost } from "@/lib/reddit"
import { supabase } from "@/lib/supabase/client"
import { getSettings } from "@/lib/settings"
import { fetchWebSearchTrends, analyzeRedditTrends, AIProvider } from "@/lib/ai"

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
    const [settings, redditPosts] = await Promise.all([
      getSettings(),
      fetchRedditPosts().catch(() => [] as RedditPost[]),
    ])

    const provider: AIProvider = (settings?.ai_provider as AIProvider) ?? "anthropic"
    const topicClusters = settings?.topic_clusters ?? [
      "AI SDR 2026", "sales copilot productivity", "signal-based selling",
      "outbound automation", "B2B sales AI", "revenue operations",
    ]

    const [webTrends, redditTrends] = await Promise.allSettled([
      fetchWebSearchTrends(topicClusters, provider),
      redditPosts.length > 0 ? analyzeRedditTrends(redditPosts, provider) : Promise.resolve([]),
    ])

    const trends: Trend[] = [
      ...(webTrends.status === "fulfilled" ? webTrends.value : []),
      ...(redditTrends.status === "fulfilled" ? redditTrends.value : []),
    ]

    if (webTrends.status === "rejected") console.error("webTrends error:", webTrends.reason)

    if (trends.length === 0) {
      return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 })
    }

    saveTrends(trends).catch(console.error)
    return NextResponse.json({ trends })
  } catch (error) {
    console.error("Trends API error:", error)
    return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 })
  }
}
