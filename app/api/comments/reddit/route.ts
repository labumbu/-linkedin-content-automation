import { NextRequest, NextResponse } from "next/server"
import { getSettings, buildSystemPrompt, getKnowledgeBase } from "@/lib/settings"
import { generatePosts, AIProvider } from "@/lib/ai"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { RedditCommentRequestSchema } from "@/lib/schemas"

const REDDIT_ARCHETYPES = {
  "Detailed Helper": {
    trigger: "Someone asks a specific how-to question",
    style: "Acknowledge problem → structured 3–5 step answer → share relevant experience",
    wordCount: "100–250 words",
  },
  "Tool Roundup": {
    trigger: "Someone asks 'what tools for X?'",
    style: "List 3–5 tools with honest pros/cons → if mentioning Harvey, place it in the middle with full disclosure",
    wordCount: "100–200 words",
  },
  "Storyteller": {
    trigger: "Thread invites personal experience sharing",
    style: "Situation → what we tried → what failed → what worked → key takeaway",
    wordCount: "150–300 words",
  },
  "Myth Buster": {
    trigger: "Someone makes a debatable claim",
    style: "Acknowledge why they think that → reframe with data or evidence → nuanced take",
    wordCount: "80–200 words",
  },
  "Mini-Guide": {
    trigger: "Broad 'how do I...' question",
    style: "Context → numbered steps with detail → common mistakes → offer to answer more",
    wordCount: "200–350 words",
  },
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(getRateLimitKey(req, "comments"), 20, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: `Rate limit exceeded. Try again in ${rl.retryAfterSeconds} seconds.` }, { status: 429 })
  }

  const body = await req.json()
  const parsed = RedditCommentRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  const { trendTitle, trendSummary, trendUrl, archetype, noHarvey, commentSize } = parsed.data

  const sizeMap = { short: "50–100 words", medium: "100–200 words", long: "200–350 words" }

  const [settings, knowledgeItems] = await Promise.all([getSettings(), getKnowledgeBase()])
  const provider: AIProvider = (settings?.ai_provider as AIProvider) ?? "anthropic"
  const systemPrompt = settings ? await buildSystemPrompt(settings, knowledgeItems) : ""

  const archetypeList = Object.entries(REDDIT_ARCHETYPES)
    .map(([name, def]) => `**${name}**\n  Trigger: ${def.trigger}\n  Style: ${def.style}\n  Length: ${def.wordCount}`)
    .join("\n\n")

  const autoMode = !archetype || archetype === "auto"

  const userPrompt = `You are writing a Reddit comment for a B2B sales / AI tools thread.

Thread topic: "${trendTitle}"
${trendSummary ? `Thread summary: ${trendSummary}` : ""}
${trendUrl ? `Thread URL: ${trendUrl}` : ""}

${autoMode
    ? `First, choose the BEST archetype for this thread from the list below. Return your choice as "recommendedArchetype".`
    : `Use the archetype: **${archetype}**`
  }

Available archetypes:
${archetypeList}

REDDIT COMPLIANCE RULES (mandatory):
- RD-001: NO direct links of any kind
- RD-002: NO corporate language (leverage, synergize, scalable solution, game-changer, etc.)
${noHarvey
  ? "- RD-003: Do NOT mention Harvey, any AI tool, or any specific product. Focus entirely on providing genuine value."
  : "- RD-003: If you mention Harvey, add disclosure: \"disclosure: I'm building this\"\n- RD-004: If Harvey is mentioned, also list 2+ competitor alternatives (e.g. Salesloft, Apollo, Clay)\n- RD-008: Harvey mention must be <10% of total word count — focus on providing value"
}
- RD-005: NO emojis, NO hashtags
- RD-006: Length must be ${sizeMap[commentSize]} — this overrides archetype word count defaults
- RD-007: Use Reddit-native formatting: **bold** for key terms, numbered lists, line breaks between paragraphs

Write in first person, casual peer tone. Sound like a practitioner sharing real experience, not a marketer.

Return ONLY valid JSON:
{
  "comment": "the full comment text with Reddit formatting",
  "archetype": "the archetype name used",
  "wordCount": 145,
  "recommendedArchetype": "same as archetype if auto-selected, or null if archetype was specified"
}`

  try {
    const text = await generatePosts(systemPrompt, userPrompt, provider)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("No JSON in response")
    const result = JSON.parse(jsonMatch[0])

    return NextResponse.json(result)
  } catch (err) {
    console.error("Reddit comment error:", err)
    return NextResponse.json({ error: "Comment generation failed" }, { status: 500 })
  }
}
