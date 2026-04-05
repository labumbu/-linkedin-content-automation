// Uses Reddit's public JSON API — no OAuth credentials required
const SUBREDDITS = ["sales", "SaaS", "B2BMarketing", "startups", "Entrepreneur", "artificial"]
const USER_AGENT = "harvey-content-fabric/1.0.0"
const MIN_SCORE = 20

export interface RedditPost {
  title: string
  selftext: string
  score: number
  subreddit: string
  num_comments: number
  permalink: string
}

async function fetchSubreddit(subreddit: string): Promise<RedditPost[]> {
  const res = await fetch(
    `https://www.reddit.com/r/${subreddit}/hot.json?limit=15`,
    {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 0 },
    }
  )

  if (!res.ok) return []

  const data = await res.json()
  return data.data.children
    .map((c: any) => c.data)
    .filter((p: any) => p.score >= MIN_SCORE && !p.stickied)
    .map((p: any) => ({
      title: p.title,
      selftext: p.selftext?.slice(0, 400) || "",
      score: p.score,
      subreddit: p.subreddit,
      num_comments: p.num_comments,
      permalink: `https://reddit.com${p.permalink}`,
    }))
}

export interface RedditThread {
  title: string
  body: string
  score: number
  topComments: { author: string; body: string; score: number }[]
}

export async function fetchRedditThread(url: string): Promise<RedditThread | null> {
  try {
    const clean = url.replace(/\/$/, "")
    const res = await fetch(`${clean}.json?limit=10`, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const post = data[0]?.data?.children?.[0]?.data
    if (!post) return null
    const comments = (data[1]?.data?.children ?? [])
      .map((c: any) => c.data)
      .filter((c: any) => c.body && c.body !== "[deleted]" && c.body !== "[removed]")
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5)
      .map((c: any) => ({ author: c.author, body: c.body.slice(0, 400), score: c.score }))
    return {
      title: post.title,
      body: post.selftext?.slice(0, 1000) || "",
      score: post.score,
      topComments: comments,
    }
  } catch {
    return null
  }
}

export async function fetchRedditPosts(subreddits?: string[]): Promise<RedditPost[]> {
  const list = subreddits && subreddits.length > 0 ? subreddits : SUBREDDITS
  const results = await Promise.allSettled(
    list.map((sub) => fetchSubreddit(sub))
  )

  const posts = results
    .filter((r): r is PromiseFulfilledResult<RedditPost[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)

  return posts
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
}
