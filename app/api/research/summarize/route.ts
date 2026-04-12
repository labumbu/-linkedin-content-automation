import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { getSettings } from "@/lib/settings"
import { resolveProvider, AIProvider } from "@/lib/ai"
import { ResearchSummarizeRequestSchema } from "@/lib/schemas"
import { stripHtml } from "@/lib/html"

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

async function fetchUrlContent(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "harvey-content-fabric/1.0.0" },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    return stripHtml(html).slice(0, 10000)
  } finally {
    clearTimeout(timer)
  }
}

const SUMMARIZE_PROMPT = (content: string, source: string) => `Summarize the following content from ${source}.

Extract and return a JSON object with these fields:
- title: string — the article/document title or topic
- summary: string — a clear 2–3 paragraph summary in plain language
- bullets: string[] — 4–6 key takeaways as concise bullet points
- stats: string[] — up to 5 notable statistics or data points (empty array if none found)
- sentiment: "positive" | "neutral" | "negative" — overall tone

Return ONLY a valid JSON object. No preamble, no markdown.

Content:
${content}`

const SUMMARIZE_PDF_PROMPT = (source: string) => `Summarize this PDF document from ${source}.

Extract and return a JSON object with these fields:
- title: string — the document title or topic
- summary: string — a clear 2–3 paragraph summary in plain language
- bullets: string[] — 4–6 key takeaways as concise bullet points
- stats: string[] — up to 5 notable statistics or data points (empty array if none found)
- sentiment: "positive" | "neutral" | "negative" — overall tone

Return ONLY a valid JSON object. No preamble, no markdown.`

async function summarizeWithAnthropic(content: string, source: string): Promise<string> {
  const res = await getAnthropic().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: SUMMARIZE_PROMPT(content, source) }],
  })
  return res.content[0].type === "text" ? res.content[0].text : ""
}

async function summarizeWithOpenAI(content: string, source: string): Promise<string> {
  const res = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    messages: [{ role: "user", content: SUMMARIZE_PROMPT(content, source) }],
  })
  return res.choices[0]?.message?.content ?? ""
}

async function summarizePdfWithAnthropic(file: File, source: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString("base64")
  const res = await getAnthropic().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } } as any,
        { type: "text", text: SUMMARIZE_PDF_PROMPT(source) },
      ],
    }],
  })
  return res.content[0].type === "text" ? res.content[0].text : ""
}

async function summarizePdfWithOpenAI(file: File, source: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString("base64")
  const res = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        { type: "file", file: { filename: file.name, file_data: `data:application/pdf;base64,${base64}` } } as any,
        { type: "text", text: SUMMARIZE_PDF_PROMPT(source) },
      ],
    }],
  })
  return res.choices[0]?.message?.content ?? ""
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? ""

  const settings = await getSettings()
  const provider = resolveProvider(settings?.ai_provider as AIProvider)

  // PDF upload — single direct call, no intermediate extraction step
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    const pdfSource = file.name
    try {
      const text = provider === "openai"
        ? await summarizePdfWithOpenAI(file, pdfSource)
        : await summarizePdfWithAnthropic(file, pdfSource)
      const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()
      const match = stripped.match(/\{[\s\S]*\}/)
      if (!match) throw new Error("No JSON in response")
      const result = JSON.parse(match[0])
      return NextResponse.json({ ...result, source_url: pdfSource })
    } catch (err) {
      console.error("PDF summarize error:", err)
      return NextResponse.json({ error: "Failed to summarize PDF", detail: String(err) }, { status: 500 })
    }
  }

  // URL
  const body = await req.json()
  const parsed = ResearchSummarizeRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  const { url } = parsed.data

  let rawContent = ""
  try {
    rawContent = await fetchUrlContent(url)
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch URL", detail: String(err) }, { status: 500 })
  }

  if (!rawContent || rawContent.length < 100) {
    return NextResponse.json({ error: "Not enough content to summarize" }, { status: 422 })
  }

  try {
    const text = provider === "openai"
      ? await summarizeWithOpenAI(rawContent, url)
      : await summarizeWithAnthropic(rawContent, url)

    const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()
    const match = stripped.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("No JSON in response")
    const result = JSON.parse(match[0])
    return NextResponse.json({ ...result, source_url: url })
  } catch (err) {
    console.error("Summarize error:", err)
    return NextResponse.json({ error: "Summarization failed" }, { status: 500 })
  }
}
