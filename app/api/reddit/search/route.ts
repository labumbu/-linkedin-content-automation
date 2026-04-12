import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"

interface RedditPost {
  id: string
  title: string
  author: string
  subreddit: string
  score: number
  num_comments: number
  url: string
  permalink: string
  created_utc: number
  selftext: string
  upvote_ratio: number
}

const B2B_SUBREDDITS = [
  "sales", "SaaS", "B2BMarketing", "startups", "Entrepreneur",
  "artificial", "smallbusiness", "marketing", "business",
]

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(getRateLimitKey(req, "reddit-search"), 20, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: `Rate limit exceeded. Try again in ${rl.retryAfterSeconds} seconds.` }, { status: 429 })
  }

  const { keywords, subreddits, minScore = 5, sortBy = "relevance" } = await req.json()

  if (!keywords || typeof keywords !== "string" || keywords.trim().length < 2) {
    return NextResponse.json({ error: "keywords must be at least 2 characters" }, { status: 400 })
  }

  const targetSubreddits: string[] = subreddits?.length > 0 ? subreddits : B2B_SUBREDDITS
  const query = encodeURIComponent(keywords.trim())
  const results: RedditPost[] = []

  await Promise.allSettled(
    targetSubreddits.map(async (sub) => {
      try {
        const url = `https://www.reddit.com/r/${sub}/search.json?q=${query}&restrict_sr=1&sort=${sortBy}&limit=5&t=month`
        const res = await fetch(url, {
          headers: {
            "User-Agent": "harvey-content-fabric/1.0.0",
            "Accept": "application/json",
          },
          signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) return
        const data = await res.json()
        const posts: RedditPost[] = (data?.data?.children ?? [])
          .map((c: any) => c.data)
          .filter((p: any) => p.score >= minScore && !p.is_video && !p.stickied)
          .map((p: any) => ({
            id: p.id,
            title: p.title,
            author: p.author,
            subreddit: p.subreddit,
            score: p.score,
            num_comments: p.num_comments,
            url: `https://reddit.com${p.permalink}`,
            permalink: p.permalink,
            created_utc: p.created_utc,
            selftext: (p.selftext ?? "").slice(0, 300),
            upvote_ratio: p.upvote_ratio,
          }))
        results.push(...posts)
      } catch {
        // subreddit blocked or 403 — skip silently
      }
    })
  )

  // Sort by engagement potential (comments weighted more — commenting opportunity)
  results.sort((a, b) => (b.num_comments * 2 + b.score) - (a.num_comments * 2 + a.score))

  // Deduplicate by id
  const seen = new Set<string>()
  const deduplicated = results.filter(p => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  return NextResponse.json({ posts: deduplicated.slice(0, 20) })
}
