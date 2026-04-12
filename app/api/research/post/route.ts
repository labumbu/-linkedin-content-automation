import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import { getSettings, getKnowledgeBase, buildSystemPrompt } from "@/lib/settings"
import { generatePosts, resolveProvider, AIProvider } from "@/lib/ai"
import { Tone, DigestResult } from "@/lib/types"

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
  const { digestId, tone, humanityLevel = 3, postSize = "Medium", includeHarvey = false } = await req.json()

  if (!digestId) {
    return NextResponse.json({ error: "digestId is required" }, { status: 400 })
  }

  // Load the digest from Supabase
  const { data: digestRow, error: dbError } = await supabase
    .from("digests")
    .select("digest_json")
    .eq("id", digestId)
    .single()

  if (dbError || !digestRow) {
    return NextResponse.json({ error: "Digest not found" }, { status: 404 })
  }

  const digest = digestRow.digest_json as DigestResult
  const { weekRange, webSynthesis, redditPulse, harveyAngle } = digest

  const findings = webSynthesis.keyFindings?.slice(0, 6).map((f) => `• ${f}`).join("\n") || "No specific findings."
  const stats = webSynthesis.notableStats?.join(", ") || "No specific stats."
  const painPoints = redditPulse.communityPainPoints?.slice(0, 5).map((p) => `• ${p}`).join("\n") || "No specific pain points."

  const [settings, knowledgeItems] = await Promise.all([getSettings(), getKnowledgeBase()])
  const provider = resolveProvider(settings?.ai_provider as AIProvider)
  const systemPrompt = settings ? await buildSystemPrompt(settings, knowledgeItems, tone) : ""

  const toneInstruction = toneInstructions[(tone as Tone) ?? "Direct & Bold"]
  const humanityInstruction = humanityInstructions[Math.min(5, Math.max(1, Math.round(humanityLevel)))]
  const sizeInstruction = sizeInstructions[postSize] ?? sizeInstructions["Medium"]

  const harveyInstruction = includeHarvey
    ? `Harvey angle: Weave in one natural connection to Harvey's value proposition — Harvey is an AI copilot for B2B sales teams that closes the full loop: prospecting, outreach, follow-up, and pipeline in one place. Position it as a solution to the problem the data highlights. One mention max. Do NOT make Harvey the focus of the post.`
    : `Do NOT mention Harvey, any specific AI tool, or any company by name. Pure data and insight only.`

  const harveyPoints = harveyAngle.relevancePoints?.slice(0, 3).join("; ") ?? ""

  const userPrompt = `You are writing a LinkedIn post that positions you as a trusted curator and analyst of B2B sales & AI news.

The post must read like a weekly news roundup — it synthesises the most important developments from web news AND what practitioners are actually saying on Reddit this week. It should feel like a smart briefing, not a generic opinion piece.

WEEK COVERED: ${weekRange}

TOP WEB NEWS THIS WEEK:
${findings}

NOTABLE STATS FROM THE NEWS: ${stats}

WHAT PRACTITIONERS ARE SAYING ON REDDIT THIS WEEK:
Headline: ${redditPulse.headline}
Pain points & discussions:
${painPoints}
${includeHarvey && harveyPoints ? `\nHOW HARVEY ADDRESSES THIS: ${harveyPoints}` : ""}

Writing rules:
- Hook (first 1–2 lines): 6–10 words — reference the week or a specific stat/finding. Must feel timely ("This week in B2B sales…" style or a specific number from the data).
- Body: weave together 2–3 key web findings AND 1–2 Reddit community signals — make it clear these come from real market data this week
- Sentences under 12 words. Short paragraphs. One idea per paragraph.
- Specific numbers and named findings wherever possible — no vague generalisations
- Tone: you are sharing what you learned this week, not writing a press release
- End with a question that invites readers to share what they're seeing this week

Tone instruction: ${toneInstruction}
Size instruction: ${sizeInstruction}
Humanity instruction: ${humanityInstruction}
${harveyInstruction}

End with exactly 3–5 relevant hashtags on the last line.

Return ONLY the post text. No explanation, no JSON, no preamble.`

  try {
    const text = await generatePosts(systemPrompt, userPrompt, provider)
    return NextResponse.json({ content: text.trim() })
  } catch (err) {
    console.error("Research post error:", err)
    return NextResponse.json({ error: "Post generation failed" }, { status: 500 })
  }
}
