import { NextRequest, NextResponse } from "next/server"
import { getSettings, getKnowledgeBase, buildSystemPrompt } from "@/lib/settings"
import { generatePosts, AIProvider } from "@/lib/ai"
import { Tone } from "@/lib/types"

const toneInstructions: Record<Tone, string> = {
  "Direct & Bold": "Be direct and bold. State strong opinions without hedging. Own the perspective.",
  "Data-Driven": "Lead with specific data, statistics, and real numbers. Every claim should feel backed by evidence.",
  "Contrarian": "Challenge the conventional wisdom on this topic. Open with something like 'Hot take:' or 'Unpopular opinion:'. Disagree with the majority view and defend it.",
  "Storytelling": "Open with a brief specific story or scenario — a real situation a sales rep or founder would recognize. Make it personal before delivering the insight.",
  "HOW TO": "Structure the post as a practical HOW TO guide optimized for LinkedIn virality. Open with a curiosity-gap hook in 1-2 short lines. Then deliver 3-5 numbered ultra-specific steps — each under 12 words. End with a simple question that invites a short answer. Every step must be immediately actionable.",
  "WHAT TO": "Structure the post as a WHAT TO do (and what NOT to do) guide. Open with a bold contrarian hook. Present 3-5 clear DO / DON'T contrasts with specific, measurable recommendations. End with a polarizing question that drives comments. Sentences under 12 words.",
}

const humanityInstructions: Record<number, string> = {
  1: "Write in a polished, professional tone. Clean sentences, no contractions, structured flow.",
  2: "Mostly professional but allow occasional contractions. Slightly warmer than corporate.",
  3: "Balanced — clear and direct but sounds like a real person. Occasional contractions OK.",
  4: "Conversational and personal. Use contractions freely. Slight informality. First-person feels genuine.",
  5: "Raw and human. Write like you typed it yourself late at night. Short bursts. Real opinions. Imperfect but authentic. Avoid anything that sounds like AI copy.",
}

export async function POST(req: NextRequest) {
  const { topic, tone, experience, context, humanityLevel = 3 } = await req.json()

  if (!topic || !experience) {
    return NextResponse.json({ error: "topic and experience are required" }, { status: 400 })
  }

  const [settings, knowledgeItems] = await Promise.all([getSettings(), getKnowledgeBase()])
  const provider: AIProvider = (settings?.ai_provider as AIProvider) ?? "anthropic"
  const systemPrompt = settings ? await buildSystemPrompt(settings, knowledgeItems) : ""

  const toneInstruction = toneInstructions[(tone as Tone) ?? "Direct & Bold"]
  const humanityInstruction = humanityInstructions[Math.min(5, Math.max(1, Math.round(humanityLevel)))]
  const contextBlock = context?.trim()
    ? `\n\nAdditional context to weave in:\n${context.trim()}`
    : ""

  const userPrompt = `Write a single LinkedIn post on this topic: "${topic}"

The post must be grounded in this personal experience:
${experience}
${contextBlock}

Tone instruction: ${toneInstruction}
Humanity instruction: ${humanityInstruction}

Write in first person. The post should feel like it came from lived experience, not generic advice.
Use LinkedIn best practices: strong hook in the first 1-2 lines, short paragraphs, white space, closing question or statement.
End with up to 8 relevant hashtags on the last line.

Return ONLY the post text. No explanation, no JSON, no preamble.`

  try {
    const text = await generatePosts(systemPrompt, userPrompt, provider)
    return NextResponse.json({ content: text.trim() })
  } catch (err) {
    console.error("Research post error:", err)
    return NextResponse.json({ error: "Post generation failed" }, { status: 500 })
  }
}
