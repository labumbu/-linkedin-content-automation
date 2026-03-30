import OpenAI from "openai"
import { Trend } from "@/lib/types"
import { RedditPost } from "@/lib/reddit"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function fetchWebSearchTrends(topicClusters: string[]): Promise<Trend[]> {
  const response = await client.responses.create({
    model: "gpt-4o",
    tools: [{ type: "web_search_preview" } as any],
    input: `Search for the top 6 trending topics RIGHT NOW in AI sales, B2B sales technology, and sales automation in 2026.

Search for topics related to: ${topicClusters.join(", ")}.

Return ONLY a JSON array of exactly 6 trend objects:
[{ "id": "ws-1", "title": "...", "summary": "...", "source": "Web Search", "relevanceScore": 8, "velocity": "hot" }]

Rules: id prefixed "ws-", relevanceScore 0-10, velocity: hot/rising/stable. Return ONLY the JSON array.`,
  } as any)

  const text = (response as any).output_text ?? ""
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error("No JSON in response")
  return JSON.parse(match[0])
}

export async function analyzeRedditTrends(posts: RedditPost[]): Promise<Trend[]> {
  const postList = posts
    .map((p, i) => `${i + 1}. [r/${p.subreddit}] "${p.title}" (${p.score} upvotes, ${p.num_comments} comments)${p.selftext ? `\n   Context: ${p.selftext}` : ""}`)
    .join("\n\n")

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: `Analyze these Reddit posts and identify the top 4 trends for AI-powered B2B sales teams:

${postList}

Return ONLY a JSON array of 4 objects with "sourceIndex" (1-based):
[{ "id": "rd-1", "sourceIndex": 1, "title": "...", "summary": "...", "source": "Reddit", "relevanceScore": 7, "velocity": "rising" }]

Rules: id prefixed "rd-", relevanceScore 0-10, velocity: hot/rising/stable. Return ONLY the JSON array.`,
    }],
  })

  const text = response.choices[0]?.message?.content ?? ""
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  const raw = JSON.parse(match[0])
  return raw.map((t: any) => ({
    ...t,
    upvotes: posts[t.sourceIndex - 1]?.score,
    comments: posts[t.sourceIndex - 1]?.num_comments,
  }))
}

export async function generatePostsWithOpenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  })
  return response.choices[0]?.message?.content ?? ""
}

export async function extractPdfWithOpenAI(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString("base64")

  const response = await client.responses.create({
    model: "gpt-4o",
    input: [
      { type: "input_file", filename: file.name, file_data: `data:application/pdf;base64,${base64}` },
      { type: "input_text", text: "Extract all key information: company description, product features, value proposition, target customers, competitive advantages, messaging. Return plain text only." },
    ],
  } as any)

  return (response as any).output_text ?? ""
}
