import Anthropic from "@anthropic-ai/sdk"
import { Trend } from "@/lib/types"
import { RedditPost } from "@/lib/reddit"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function fetchWebSearchTrends(topicClusters: string[]): Promise<Trend[]> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    tools: [{ type: "web_search_20250305", name: "web_search" } as any],
    messages: [{
      role: "user",
      content: `Search for the top 20 trending topics RIGHT NOW in AI sales, B2B sales technology, and sales automation in 2026.

Search for topics related to: ${topicClusters.join(", ")}.

Return ONLY a JSON array of exactly 20 trend objects:
[{ "id": "ws-1", "title": "...", "summary": "...", "source": "Web Search", "relevanceScore": 8, "velocity": "hot" }]

Rules: id prefixed "ws-", relevanceScore 0-10, velocity: hot/rising/stable. Return ONLY the JSON array.`,
    }],
  })

  let jsonText = ""
  for (const block of response.content) {
    if (block.type === "text") { jsonText = block.text; break }
  }
  const match = jsonText.match(/\[[\s\S]*\]/)
  if (!match) throw new Error("No JSON in response")
  return JSON.parse(match[0])
}

export async function analyzeRedditTrends(posts: RedditPost[]): Promise<Trend[]> {
  const postList = posts
    .map((p, i) => `${i + 1}. [r/${p.subreddit}] "${p.title}" (${p.score} upvotes, ${p.num_comments} comments)${p.selftext ? `\n   Context: ${p.selftext}` : ""}`)
    .join("\n\n")

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `Summarize these Reddit posts as trends. For each post, write a clear and honest summary of what it is actually about — do not reframe or inject AI/sales language if it isn't there. Pick the top 4 most interesting posts.

${postList}

Return ONLY a JSON array of 4 objects with "sourceIndex" (1-based):
[{ "id": "rd-1", "sourceIndex": 1, "title": "...", "summary": "one honest sentence describing what this post is actually about", "source": "Reddit", "relevanceScore": 7, "velocity": "rising" }]

Rules: id prefixed "rd-", relevanceScore 0-10 (how relevant to B2B sales/SaaS practitioners), velocity: hot/rising/stable. Return ONLY the JSON array.`,
    }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  const raw = JSON.parse(match[0])
  return raw.map((t: any) => ({
    ...t,
    upvotes: posts[t.sourceIndex - 1]?.score,
    comments: posts[t.sourceIndex - 1]?.num_comments,
    source_url: posts[t.sourceIndex - 1]?.permalink,
  }))
}

export async function generatePostsWithAnthropic(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  })
  return message.content[0].type === "text" ? message.content[0].text : ""
}

export async function extractPdfWithAnthropic(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString("base64")

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } } as any,
        { type: "text", text: "Extract all key information: company description, product features, value proposition, target customers, competitive advantages, messaging. Return plain text only." },
      ],
    }],
  })
  return response.content[0].type === "text" ? response.content[0].text : ""
}
