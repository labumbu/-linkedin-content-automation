import { NextResponse } from "next/server"
import { getCachedSystemPrompt, invalidateSystemPromptCache } from "@/lib/settings"

export async function GET() {
  const prompt = await getCachedSystemPrompt()
  return NextResponse.json({ prompt })
}

export async function POST() {
  await invalidateSystemPromptCache()
  const prompt = await getCachedSystemPrompt()
  return NextResponse.json({ prompt })
}
