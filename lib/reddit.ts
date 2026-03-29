const SUBREDDITS = ["sales", "SaaS", "B2BMarketing", "startups", "Entrepreneur", "artificial"]
const USER_AGENT = "web:harvey-content-fabric:v1.0.0"
const MIN_SCORE = 20

export interface RedditPost {
  title: string
  selftext: string
  score: number
  subreddit: string
  num_comments: number
  permalink: string
}

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
  ).toString("base64")

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: "grant_type=client_credentials",
  })

  if (!res.ok) throw new Error(`Reddit auth failed: ${res.status}`)

  const data = await res.json()
  return data.access_token
}

async function fetchSubreddit(subreddit: string, token: string): Promise<RedditPost[]> {
  const res = await fetch(
    `https://oauth.reddit.com/r/${subreddit}/hot?limit=15`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": USER_AGENT,
      },
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

export async function fetchRedditPosts(): Promise<RedditPost[]> {
  const token = await getAccessToken()

  const results = await Promise.allSettled(
    SUBREDDITS.map((sub) => fetchSubreddit(sub, token))
  )

  const posts = results
    .filter((r): r is PromiseFulfilledResult<RedditPost[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)

  // Sort by score, deduplicate by title similarity, return top 10
  return posts
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
}
