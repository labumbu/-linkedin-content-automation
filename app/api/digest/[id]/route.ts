import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabase
    .from("digests")
    .select("digest_json")
    .eq("id", id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Digest not found" }, { status: 404 })
  }

  return NextResponse.json({ digest: data.digest_json })
}
