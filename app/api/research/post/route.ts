import { NextRequest, NextResponse } from "next/server"
import { getSettings, getKnowledgeBase, buildSystemPrompt } from "@/lib/settings"
import { generatePosts, resolveProvider, AIProvider } from "@/lib/ai"
import { Tone } from "@/lib/types"

const toneInstructions: Record<Tone, string> = {
  "Direct & Bold": "Be direct and bold. State strong opinions without hedging. Own the perspective.",
  "Data-Driven": "Lead with specific data, statistics, and real numbers. Every claim should feel backed by evidence.",
  "Contrarian": "Challenge the conventional wisdom on this topic. Open with something like 'Hot take:' or 'Unpopular opinion:'. Disagree with the majority view and defend it.",
  "Storytelling": "Open with a surprising data point or finding, then unpack the story behind the numbers.",
  "HOW TO": "Structure the post as a practical HOW TO guide. Open with a curiosity-gap hook in 1-2 short lines. Then deliver 3-5 numbered ultra-specific steps — each under 12 words. End with a simple question that invites a short answer.",
  "WHAT TO": "Structure the post as a WHAT TO do (and what NOT to do) guide. Open with a bold contrarian hook backed by data. Present 3-5 clear DO / DON'T contrasts with specific, measurable recommendations. End with a polarizing question that drives comments.",
}

const humanityInstructions: Record<number, string> = {
  1: "Write in a polished, professional tone. Clean sentences, no contractions, structured flow.",
  2: "Mostly professional but allow occasional contractions. Slightly warmer than corporate.",
  3: "Balanced — clear and direct but sounds like a real person. Occasional contractions OK.",
  4: "Conversational and personal. Use contractions freely. Slight informality. First-person feels genuine.",
  5: "Raw and human. Write like you typed it yourself late at night. Short bursts. Real opinions. Imperfect but authentic. Avoid anything that sounds like AI copy.",
}

const sizeInstructions: Record<string, string> = {
  "Short": "400–600 characters. One sharp idea, one hook, one closing line.",
  "Medium": "700–1,300 characters. The research sweet spot — balanced depth and readability.",
  "Long": "1,200–1,600 characters. Full story + data + framework. Never exceed 1,600 — engagement drops above this.",
}

export async function POST(req: NextRequest) {
  const { topic, tone, experience, context, humanityLevel = 3, postSize = "Medium", includeHarvey = false } = await req.json()

  if (!topic || !experience) {
    return NextResponse.json({ error: "topic and research notes are required" }, { status: 400 })
  }

  const [settings, knowledgeItems] = await Promise.all([getSettings(), getKnowledgeBase()])
  const provider = resolveProvider(settings?.ai_provider as AIProvider)
  const systemPrompt = settings ? await buildSystemPrompt(settings, knowledgeItems, tone) : ""

  const toneInstruction = toneInstructions[(tone as Tone) ?? "Direct & Bold"]
  const humanityInstruction = humanityInstructions[Math.min(5, Math.max(1, Math.round(humanityLevel)))]
  const sizeInstruction = sizeInstructions[postSize] ?? sizeInstructions["Medium"]

  const contextBlock = context?.trim()
    ? `\n\nAdditional context:\n${context.trim()}`
    : ""

  const harveyInstruction = includeHarvey
    ? `\nHarvey angle: Weave in one natural connection to Harvey's value proposition — Harvey is an AI copilot for B2B sales teams that closes the full loop: prospecting, outreach, follow-up, and pipeline in one place. Position it as a solution to the problem the data highlights. One mention max. Do NOT make Harvey the focus of the post.`
    : `\nDo NOT mention Harvey, any specific AI tool, or any company by name. Pure data and insight only.`

  const userPrompt = `Write a single data-driven LinkedIn post on this topic: "${topic}"

Ground the post in these research insights, data points, and observations:
${experience}
${contextBlock}

Writing rules:
- Hook (first 1–2 lines): 6–10 words maximum — a specific number, bold finding, or counterintuitive fact. Not an opinion. This line determines 90% of reach.
- Sentences under 12 words throughout the body (+20% engagement — research-backed)
- Open with a striking statistic, surprising finding, or counterintuitive pattern — not an opinion, a FACT
- Every claim must feel backed by evidence, data, or a recognizable industry pattern
- Use specific numbers wherever possible: percentages, dollar amounts, timeframes, ratios
- Replace vague language ("many companies", "most teams") with specific observations
- Short paragraphs. One idea per paragraph. Aggressive white space for LinkedIn readability.
- End with a provocative insight or question that challenges conventional thinking

Tone instruction: ${toneInstruction}
Size instruction: ${sizeInstruction}
Humanity instruction: ${humanityInstruction}
${harveyInstruction}

End with exactly 3–5 relevant hashtags on the last line. More than 5 hurts algorithmic reach.

Return ONLY the post text. No explanation, no JSON, no preamble.`

  try {
    const text = await generatePosts(systemPrompt, userPrompt, provider)
    return NextResponse.json({ content: text.trim() })
  } catch (err) {
    console.error("Research post error:", err)
    return NextResponse.json({ error: "Post generation failed" }, { status: 500 })
  }
}
