import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

async function extractFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString("base64")

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          } as any,
          {
            type: "text",
            text: "Extract all key information from this document: company description, product features, value proposition, target customers, competitive advantages, messaging. Return plain text only, no formatting.",
          },
        ],
      },
    ],
  })

  return response.content[0].type === "text" ? response.content[0].text : ""
}

async function extractFromUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "harvey-content-fabric/1.0.0" },
  })
  const html = await res.text()
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return text.slice(0, 5000)
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || ""

  // PDF upload
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    try {
      const content = await extractFromPdf(file)
      const { data, error } = await supabase
        .from("knowledge_base")
        .insert({ type: "pdf", name: file.name, content })
        .select()
        .single()

      if (error) return NextResponse.json({ error: "Failed to save" }, { status: 500 })
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ error: "Failed to parse PDF" }, { status: 500 })
    }
  }

  // URL add
  const { url, name } = await req.json()
  if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 })

  try {
    const content = await extractFromUrl(url)
    const { data, error } = await supabase
      .from("knowledge_base")
      .insert({ type: "url", name: name || url, source_url: url, content })
      .select()
      .single()

    if (error) return NextResponse.json({ error: "Failed to save" }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Failed to fetch URL" }, { status: 500 })
  }
}

export async function GET() {
  const { data, error } = await supabase
    .from("knowledge_base")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: "Failed to load" }, { status: 500 })
  return NextResponse.json(data)
}
