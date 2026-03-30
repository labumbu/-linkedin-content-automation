import { NextRequest } from "next/server"
import { GeneratedPost, Tone } from "@/lib/types"
import { supabase } from "@/lib/supabase/client"
import { getSettings, getKnowledgeBase, buildSystemPrompt } from "@/lib/settings"
import { generatePosts, AIProvider } from "@/lib/ai"

const FALLBACK_SYSTEM_PROMPT = `You are Harvey's content AI. Harvey is an AI copilot for B2B sales teams that closes the full loop: prospecting, outreach, follow-up, and pipeline management in one place.

Harvey's voice:
- Direct and confident, zero fluff or filler
- Specific with real data points and numbers
- Challenges conventional thinking
- Short punchy sentences. Lots of white space for LinkedIn readability.
- Never uses: "game-changer", "leverage", "synergy", "best practices", "exciting journey"
- Competitive edge: Harvey is "the full loop" vs Salesloft, Apollo, Clay, Lemlist.

LinkedIn post format rules:
- First 1-2 lines = killer hook
- Short paragraphs, max 2-3 sentences
- 400-700 characters sweet spot
- End with open question or provocative statement
- NO hashtags.`

const toneInstructions: Record<Tone, string> = {
  "Direct & Bold": "Be direct and bold. State strong opinions without hedging. Own the perspective.",
  "Data-Driven": "Lead with specific data, statistics, and real numbers. Every claim should feel backed by evidence.",
  "Contrarian": "Challenge the conventional wisdom on this topic. Open with something like 'Hot take:' or 'Unpopular opinion:'. Disagree with the majority view and defend it.",
  "Storytelling": "Open with a brief specific story or scenario — a real situation a sales rep or founder would recognize. Make it personal before delivering the insight.",
}

export async function POST(req: NextRequest) {
  const { trend, language, tone, postCount, includeCompetitor } = await req.json()

  const [settings, knowledgeItems] = await Promise.all([
    getSettings(),
    getKnowledgeBase(),
  ])

  const provider: AIProvider = (settings?.ai_provider as AIProvider) ?? "anthropic"
  const systemPrompt = settings
    ? await buildSystemPrompt(settings, knowledgeItems)
    : FALLBACK_SYSTEM_PROMPT

  const competitorList = settings?.competitors?.join(", ") ?? "Salesloft, Apollo, Clay, Lemlist"
  const languageInstruction = language === "RU"
    ? "Write all posts in Russian. Maintain Harvey's direct, data-driven, operator voice — translated naturally, not literally."
    : "Write all posts in English."
  const competitorInstruction = includeCompetitor
    ? `At least one post must include a competitive positioning angle — contrast Harvey's full-loop approach against ${competitorList}.`
    : ""

  const userPrompt = `Generate exactly ${postCount} LinkedIn posts about this trending topic:

Topic: "${trend.title}"
Context: ${trend.summary}

Tone instruction: ${toneInstructions[tone as Tone]}
${languageInstruction}
${competitorInstruction}

Each post must take a different angle on the topic. No two posts should feel alike.

Return ONLY a valid JSON array of ${postCount} objects:
[{ "id": "1", "content": "full post text — use \\n for line breaks", "characterCount": 523 }]

Return ONLY the JSON array. No explanation, no markdown code blocks, no other text.`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const text = await generatePosts(systemPrompt, userPrompt, provider)
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) throw new Error("No JSON array found")

        const posts: GeneratedPost[] = JSON.parse(jsonMatch[0])

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

          const enriched: GeneratedPost = { ...post, dbId: data?.id }
          controller.enqueue(encoder.encode(JSON.stringify(enriched) + "\n"))
          await new Promise((r) => setTimeout(r, 400))
        }

        controller.close()
      } catch (error) {
        console.error("Generate API error:", error)
        controller.enqueue(encoder.encode(JSON.stringify({ error: "Generation failed" }) + "\n"))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Transfer-Encoding": "chunked" },
  })
}
