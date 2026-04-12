import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function GET() {
  const { data, error } = await supabase
    .from("digests")
    .select("id, week_range, headline, generated_at")
    .order("generated_at", { ascending: false })
    .limit(10)

  if (error) {
    return NextResponse.json({ digests: [] })
  }

  return NextResponse.json({ digests: data ?? [] })
}
