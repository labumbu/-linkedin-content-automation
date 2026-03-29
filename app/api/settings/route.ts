import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function GET() {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single()

  if (error) return NextResponse.json({ error: "Failed to load settings" }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const body = await req.json()

  const { error } = await supabase
    .from("settings")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", 1)

  if (error) return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  return NextResponse.json({ success: true })
}
