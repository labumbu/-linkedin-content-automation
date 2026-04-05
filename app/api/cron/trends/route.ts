import { NextRequest, NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"
import { Trend } from "@/lib/types"
import { supabase } from "@/lib/supabase/client"
import { fetchWebSearchTrends, AIProvider } from "@/lib/ai"

export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const settings = await getSettings()
    const provider: AIProvider = (settings?.ai_provider as AIProvider) ?? "anthropic"
    const topicClusters = settings?.topic_clusters ?? [
      "AI SDR 2026", "sales copilot productivity", "signal-based selling",
      "outbound automation", "B2B sales AI", "revenue operations",
    ]

    // Check if the configured refresh time matches the current UTC time (within 30-minute window)
    const refreshTime = settings?.trend_refresh_time ?? "06:00"
    const [configHour, configMin] = refreshTime.split(":").map(Number)
    const now = new Date()
    const utcHour = now.getUTCHours()
    const utcMin = now.getUTCMinutes()
    const configTotalMin = configHour * 60 + configMin
    const nowTotalMin = utcHour * 60 + utcMin
    const diff = Math.abs(nowTotalMin - configTotalMin)

    // Allow a 30-minute window around the configured time
    if (diff > 30 && diff < 24 * 60 - 30) {
      return NextResponse.json({ ok: true, skipped: true, reason: "Outside scheduled window", configured: refreshTime })
    }

    const trends = await fetchWebSearchTrends(topicClusters, provider)

    if (trends.length > 0) {
      const found_at = new Date().toISOString()
      const rows = trends.map((t: Trend) => ({
        title: t.title,
        summary: t.summary,
        source: t.source,
        relevance_score: t.relevanceScore,
        velocity: t.velocity,
        upvotes: t.upvotes ?? null,
        comments: t.comments ?? null,
        source_url: t.source_url ?? null,
        found_at,
      }))
      await supabase.from("trends").insert(rows)
    }

    // Archive trends older than 14 days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    await supabase.from("trends").delete().lt("found_at", fourteenDaysAgo)

    return NextResponse.json({ ok: true, count: trends.length })
  } catch (error) {
    console.error("Cron trends error:", error)
    return NextResponse.json({ error: "Failed to refresh trends" }, { status: 500 })
  }
}
