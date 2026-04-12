import { NextRequest, NextResponse } from "next/server"
import { GeneratedPost, Tone, PostSize } from "@/lib/types"
import { supabase } from "@/lib/supabase/client"
import { getSettings, getKnowledgeBase, buildSystemPrompt } from "@/lib/settings"
import { generatePosts, resolveProvider, AIProvider } from "@/lib/ai"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { GenerateRequestSchema } from "@/lib/schemas"
import { stripHtml } from "@/lib/html"

const FALLBACK_SYSTEM_PROMPT = `You are Harvey's content AI. Harvey is an AI copilot for B2B sales teams that closes the full loop: prospecting, outreach, follow-up, and pipeline management in one place.

Harvey's voice:
- Direct and confident, zero fluff or filler
- Specific with real data points and numbers
- Challenges conventional thinking
- Sentences under 12 words. Lots of white space for LinkedIn readability.
- Never uses: "game-changer", "leverage", "synergy", "best practices", "exciting journey"
- Competitive edge: Harvey is "the full loop" vs Salesloft, Apollo, Clay, Lemlist.

LinkedIn post format rules:
- First 1-2 lines = killer hook — 6-10 words max, must use a number, bold claim, or pattern interrupt. This line determines 90% of reach.
- Short paragraphs, max 2-3 sentences
- 700-1,300 characters sweet spot for Medium posts
- End with open question or provocative statement
- 3-5 relevant hashtags on the last line (more than 5 hurts algorithmic reach — research-backed)`

const toneInstructions: Record<Tone, string> = {
  "Direct & Bold": "Be direct and bold. State strong opinions without hedging. Own the perspective.",
  "Data-Driven": "Lead with specific data, statistics, and real numbers. Every claim should feel backed by evidence.",
  "Contrarian": "Challenge the conventional wisdom on this topic. Open with something like 'Hot take:' or 'Unpopular opinion:'. Disagree with the majority view and defend it.",
  "Storytelling": "Open with a brief specific story or scenario — a real situation a sales rep or founder would recognize. Make it personal before delivering the insight.",
  "HOW TO": "Structure the post as a practical HOW TO guide optimized for LinkedIn virality. Open with a curiosity-gap hook in 1-2 short lines (e.g. 'How I [result] by doing [unexpected thing]' or 'Most [target audience] get this wrong. Here's how to fix it.'). Then deliver 3-5 numbered ultra-specific steps — each under 12 words. Use short paragraphs with line breaks. End with a simple question that invites a short answer. No fluff. Every step must be immediately actionable.",
  "WHAT TO": "Structure the post as a WHAT TO do (and what NOT to do) guide optimized for LinkedIn saves and comments. Open with a bold contrarian or pattern-interrupt hook (e.g. 'Stop doing X. Here's what actually works.'). Present 3-5 clear DO / DON'T contrasts or a 'What to do when X' framework with specific, measurable recommendations. Each point must be concrete — no generic advice. Use white space aggressively. End with a polarizing or thought-provoking question that drives comments. Sentences under 12 words. No hashtags.",
}

const sizeInstructions: Record<PostSize, string> = {
  "Short": "400–600 characters. One sharp idea, one hook, one closing line.",
  "Medium": "700–1,300 characters. The research sweet spot — balanced depth and readability.",
  "Long": "1,200–1,600 characters. Full story + data + framework. Never exceed 1,600 — engagement drops above this.",
  "Carousel": "Generate a carousel/document post. 7 slides total: 1 hook slide + 5 content slides + 1 CTA slide. Each content slide: 1 headline (max 8 words) + 2-3 bullet points (max 10 words each). Average 6.6% engagement vs 2% for text posts.",
}

const humanityInstructions: Record<number, string> = {
  1: "Write in a polished, professional tone. Clean sentences, no contractions, structured flow.",
  2: "Mostly professional but allow occasional contractions. Slightly warmer than corporate.",
  3: "Balanced — clear and direct but sounds like a real person. Occasional contractions OK.",
  4: "Conversational and personal. Use contractions freely. Slight informality. First-person feels genuine.",
  5: "Raw and human. Write like you typed it yourself late at night. Short bursts. Real opinions. Imperfect but authentic. Avoid anything that sounds like AI copy.",
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(getRateLimitKey(req, "generate"), 10, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: `Rate limit exceeded. Try again in ${rl.retryAfterSeconds} seconds.` }, { status: 429 })
  }

  const body = await req.json()
  const parsed = GenerateRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  const { trend, language, tone, postCount, postSize, humanityLevel, userGuidance, includeCompetitor, manualContent } = parsed.data

  let articleContent = ""
  if (!manualContent?.trim() && trend.source_url && !trend.source_url.includes("reddit.com")) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 6000)
      const res = await fetch(trend.source_url, {
        headers: { "User-Agent": "harvey-content-fabric/1.0.0" },
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (res.ok) {
        const html = await res.text()
        articleContent = stripHtml(html, 15000)
      }
    } catch {
      // Fall back to summary only
    }
  }

  const [settings, knowledgeItems] = await Promise.all([
    getSettings(),
    getKnowledgeBase(),
  ])

  const provider = resolveProvider(settings?.ai_provider as AIProvider)
  const systemPrompt = settings
    ? await buildSystemPrompt(settings, knowledgeItems, tone)
    : FALLBACK_SYSTEM_PROMPT

  const competitorList = settings?.competitors?.join(", ") ?? "Salesloft, Apollo, Clay, Lemlist"
  const languageInstruction = language === "RU"
    ? "Write all posts in Russian. Maintain Harvey's direct, data-driven, operator voice — translated naturally, not literally."
    : "Write all posts in English."
  const competitorInstruction = includeCompetitor
    ? `At least one post must include a competitive positioning angle — contrast Harvey's full-loop approach against ${competitorList}.`
    : ""
  const sizeInstruction = sizeInstructions[(postSize as PostSize) ?? "Medium"]
  const humanityInstruction = humanityInstructions[humanityLevel ?? 3]
  const guidanceInstruction = userGuidance?.trim()
    ? `\nAdditional instructions from the user: ${userGuidance.trim()}`
    : ""

  const finalContent = manualContent?.trim() || articleContent
  const isCarousel = (postSize as PostSize) === "Carousel"

  const userPrompt = isCarousel
    ? `Generate exactly ${postCount} LinkedIn carousel scripts about this trending topic:

Topic: "${trend.title}"
${finalContent ? `Full article content:\n${finalContent}` : `Context: ${trend.summary}`}

Tone instruction: ${toneInstructions[tone as Tone]}
Humanity instruction: ${humanityInstruction}
${languageInstruction}
${competitorInstruction}${guidanceInstruction}

CAROUSEL FORMAT (7 slides each):
- Slide 1 (Hook): Bold headline 6–10 words + 1 sub-line that creates curiosity gap
- Slides 2–6 (Content): Each has a title (max 8 words) + 2–3 bullet points (max 10 words each, specific and actionable)
- Slide 7 (CTA): Closing statement + one specific question to drive comments

Each carousel must take a different angle. After slide 7, add a companion caption for the LinkedIn post field (150 chars max, drives "see more" clicks).

Return ONLY a valid JSON array of ${postCount} objects:
[{ "id": "1", "format": "carousel", "slides": [{ "slide": 1, "title": "Hook title", "body": "Sub-line text" }, { "slide": 2, "title": "...", "body": "• Point 1\\n• Point 2\\n• Point 3" }], "content": "companion caption text (150 chars)", "characterCount": 150, "hookAlternatives": ["Alt hook 1", "Alt hook 2", "Alt hook 3"], "ctaNote": "CTA strong" }]

Return ONLY the JSON array. No explanation, no markdown code blocks, no other text.`
    : `Generate exactly ${postCount} LinkedIn posts about this trending topic:

Topic: "${trend.title}"
${finalContent ? `Full article content:\n${finalContent}` : `Context: ${trend.summary}`}

Tone instruction: ${toneInstructions[tone as Tone]}
Size instruction: ${sizeInstruction}
Humanity instruction: ${humanityInstruction}
${languageInstruction}
${competitorInstruction}${guidanceInstruction}

Each post must take a different angle on the topic. No two posts should feel alike.

Hook rule: the first 1–2 lines must be 6–10 words max — open with a specific number, counterintuitive claim, or pattern interrupt. Not an opinion. This line determines reach.
Sentence rule: keep sentences under 12 words throughout the body.

After the post body, add a blank line followed by exactly 3–5 relevant hashtags (e.g. #AISales #B2B #SalesAutomation). More than 5 hashtags hurts algorithmic reach. Hashtags must be relevant to the specific post content.

For each post, also generate:
1. hookAlternatives: 3 alternative first-line hooks (6–10 words each) using different psychological mechanisms — one with a statistic, one with a contrarian claim, one with a "how I" or pattern interrupt. These are swappable first lines only.
2. ctaNote: one sentence evaluating the closing CTA — flag if it's generic ("comment below", "share this", "what do you think?") and suggest a more specific question that would generate 15+ word replies. If the CTA is already strong and specific, say "CTA strong".

Return ONLY a valid JSON array of ${postCount} objects:
[{ "id": "1", "content": "full post text — use \\n for line breaks, hashtags on last line", "characterCount": 523, "hookAlternatives": ["Alt hook 1", "Alt hook 2", "Alt hook 3"], "ctaNote": "..." }]

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
