import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await supabase
    .from("knowledge_base")
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  return NextResponse.json({ success: true })
}
