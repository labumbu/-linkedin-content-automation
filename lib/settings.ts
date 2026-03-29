import { supabase } from "@/lib/supabase/client"

export interface Settings {
  harvey_profile: string
  icp: string
  voice_rules: string
  topic_clusters: string[]
  competitors: string[]
  default_language: string
}

export interface KnowledgeItem {
  id: string
  type: "pdf" | "url"
  name: string
  source_url: string | null
  content: string
  created_at: string
}

export async function getSettings(): Promise<Settings | null> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single()

  if (error) return null
  return data
}

export async function getKnowledgeBase(): Promise<KnowledgeItem[]> {
  const { data, error } = await supabase
    .from("knowledge_base")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return []
  return data
}

export async function buildSystemPrompt(settings: Settings, knowledgeItems: KnowledgeItem[]): Promise<string> {
  let prompt = `You are Harvey's content AI.

About Harvey:
${settings.harvey_profile}

Target Customer (ICP):
${settings.icp}

Voice & Style Rules:
${settings.voice_rules}`

  if (knowledgeItems.length > 0) {
    const context = knowledgeItems
      .slice(0, 5)
      .map((item) => `--- ${item.name} ---\n${item.content.slice(0, 1500)}`)
      .join("\n\n")

    prompt += `\n\nAdditional company context:\n${context}`
  }

  return prompt
}
