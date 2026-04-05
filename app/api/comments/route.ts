import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("Comments GET error:", error)
      return NextResponse.json({ error: "Failed to load comments" }, { status: 500 })
    }

    return NextResponse.json({ comments: data ?? [] })
  } catch (err) {
    console.error("Comments GET error:", err)
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 })
  }
}
