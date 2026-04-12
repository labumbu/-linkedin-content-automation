import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

function calcEngagementTier(reactions: number, comments: number): string {
  if (reactions >= 500 || comments >= 100) return "viral"
  if (reactions >= 150 || comments >= 30) return "high"
  if (reactions >= 30 || comments >= 5) return "average"
  return "low"
}

function extractHookText(content: string): string {
  return content.split("\n").find(l => l.trim().length > 0)?.trim() ?? ""
}

function countHashtags(content: string): number {
  return (content.match(/#\w+/g) ?? []).length
}

export async function GET() {
  const { data, error } = await supabase
    .from("post_examples")
    .select("*")
    .order("reactions", { ascending: false })

  if (error) return NextResponse.json({ error: "Failed to load examples" }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { content, hook_type, tone, format, why_it_works, topic_tags, reactions, comments, reposts, views, media_type, source_url, source } = body

  if (!content?.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 })
  }

  const hook_text = extractHookText(content)
  const char_count = content.length
  const hashtag_count = countHashtags(content)
  const engagement_tier = calcEngagementTier(reactions ?? 0, comments ?? 0)

  const { data, error } = await supabase
    .from("post_examples")
    .insert({
      content: content.trim(),
      hook_text,
      hook_type: hook_type ?? null,
      tone: tone ?? null,
      format: format ?? null,
      char_count,
      hashtag_count,
      reactions: reactions ?? null,
      comments: comments ?? null,
      reposts: reposts ?? null,
      views: views ?? null,
      media_type: media_type ?? null,
      source_url: source_url ?? null,
      engagement_tier,
      why_it_works: why_it_works ?? null,
      topic_tags: topic_tags ?? [],
      source: source ?? "own",
      active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: "Failed to save example" }, { status: 500 })
  return NextResponse.json(data)
}
