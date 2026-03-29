import Anthropic from "@anthropic-ai/sdk"
import { NextRequest } from "next/server"
import { GeneratedPost, Tone } from "@/lib/types"
import { supabase } from "@/lib/supabase/client"

const client = new Anthropic()

const HARVEY_VOICE = `You are Harvey's content AI. Harvey is an AI copilot for B2B sales teams that closes the full loop: prospecting, outreach, follow-up, and pipeline management in one place.

Harvey's voice:
- Direct and confident, zero fluff or filler
- Specific with real data points and numbers
- Challenges conventional thinking
- Speaks like an operator who has been in the trenches, not a consultant
- Short punchy sentences. Lots of white space for LinkedIn readability.
- Never uses: "game-changer", "leverage", "synergy", "best practices", "exciting journey", "thrilled to announce", "in today's landscape"
- Competitive edge: Harvey is "the full loop" — Salesloft does engagement, Apollo does data, Clay does enrichment, Lemlist does sequences. Harvey does all of it, connected.

LinkedIn post format rules:
- First 1-2 lines = killer hook that stops the scroll and makes people click "see more"
- Short paragraphs, max 2-3 sentences each
- Use line breaks generously between paragraphs
- Bullet points with - or numbers for lists
- 400-700 characters is the sweet spot
- End with an open question OR a provocative standalone statement
- NO hashtags. NO emojis unless they genuinely add value.`

const toneInstructions: Record<Tone, string> = {
  "Direct & Bold": "Be direct and bold. State strong opinions without hedging. Own the perspective.",
  "Data-Driven": "Lead with specific data, statistics, and real numbers. Every claim should feel backed by evidence.",
  "Contrarian": "Challenge the conventional wisdom on this topic. Open with something like 'Hot take:' or 'Unpopular opinion:' or 'Everyone is wrong about this.' Disagree with the majority view and defend it.",
  "Storytelling": "Open with a brief specific story or scenario — a real situation a sales rep or founder would recognize. Make it personal before delivering the insight.",
}

export async function POST(req: NextRequest) {
  const { trend, language, tone, postCount, includeCompetitor } = await req.json()

  const languageInstruction =
    language === "RU"
      ? "Write all posts in Russian. Maintain Harvey's direct, data-driven, operator voice — translated naturally, not literally."
      : "Write all posts in English."

  const competitorInstruction = includeCompetitor
    ? "At least one post must include a competitive positioning angle — contrast Harvey's full-loop approach against Salesloft, Apollo, Clay, or Lemlist."
    : ""

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const message = await client.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 4096,
          system: HARVEY_VOICE,
          messages: [
            {
              role: "user",
              content: `Generate exactly ${postCount} LinkedIn posts about this trending topic:

Topic: "${trend.title}"
Context: ${trend.summary}

Tone instruction: ${toneInstructions[tone as Tone]}
${languageInstruction}
${competitorInstruction}

Each post must take a different angle on the topic. No two posts should feel alike.

Return ONLY a valid JSON array of ${postCount} objects:
[
  {
    "id": "1",
    "content": "full post text here — use \\n for line breaks between paragraphs",
    "characterCount": 523
  }
]

Return ONLY the JSON array. No explanation, no markdown code blocks, no other text.`,
            },
          ],
        })

        const text =
          message.content[0].type === "text" ? message.content[0].text : ""

        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) throw new Error("No JSON array found")

        const posts: GeneratedPost[] = JSON.parse(jsonMatch[0])

        // Save each post to Supabase and stream with dbId
        for (const post of posts) {
          const { data } = await supabase
            .from("posts")
            .insert({
              content: post.content,
              character_count: post.characterCount,
              trend_title: trend.title,
              trend_summary: trend.summary,
              language,
              tone,
            })
            .select("id")
            .single()

          const enriched: GeneratedPost = {
            ...post,
            dbId: data?.id,
          }

          controller.enqueue(encoder.encode(JSON.stringify(enriched) + "\n"))
          await new Promise((r) => setTimeout(r, 400))
        }

        controller.close()
      } catch (error) {
        console.error("Generate API error:", error)
        controller.enqueue(
          encoder.encode(JSON.stringify({ error: "Generation failed" }) + "\n")
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  })
}
