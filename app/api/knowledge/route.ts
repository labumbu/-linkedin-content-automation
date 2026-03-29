import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

async function extractFromUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "harvey-content-fabric/1.0.0" },
  })
  const html = await res.text()
  // Strip HTML tags and collapse whitespace
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

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Dynamically import pdf-parse (avoids Next.js build issues)
    const pdfParse = (await import("pdf-parse")).default
    const parsed = await pdfParse(buffer)
    const content = parsed.text.slice(0, 5000)

    const { data, error } = await supabase
      .from("knowledge_base")
      .insert({ type: "pdf", name: file.name, content })
      .select()
      .single()

    if (error) return NextResponse.json({ error: "Failed to save" }, { status: 500 })
    return NextResponse.json(data)
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
