import { supabase } from "@/lib/supabase/client"

export interface Settings {
  harvey_profile: string
  icp: string
  voice_rules: string
  topic_clusters: string[]
  competitors: string[]
  default_language: string
  ai_provider: "anthropic" | "openai"
  trend_sources?: string[]
  trend_refresh_time?: string
  subreddits?: string[]
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

let _cachedPrompt: string | null = null

export async function getCachedSystemPrompt(): Promise<string> {
  if (_cachedPrompt) return _cachedPrompt
  const [settings, knowledgeItems] = await Promise.all([getSettings(), getKnowledgeBase()])
  if (!settings) return ""
  _cachedPrompt = await buildSystemPrompt(settings, knowledgeItems)
  return _cachedPrompt
}

export function invalidateSystemPromptCache(): void {
  _cachedPrompt = null
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
    const CHARS_PER_ITEM = 4000
    const MAX_ITEMS = 10
    const TOTAL_BUDGET = 20000

    // Most recently added items first (array comes from DB ordered by created_at DESC)
    const selectedItems = knowledgeItems.slice(0, MAX_ITEMS)
    let totalChars = 0
    const context = selectedItems
      .filter((item) => {
        const chars = Math.min(item.content.length, CHARS_PER_ITEM)
        if (totalChars + chars > TOTAL_BUDGET) return false
        totalChars += chars
        return true
      })
      .map((item) => `--- ${item.name} ---\n${item.content.slice(0, CHARS_PER_ITEM)}`)
      .join("\n\n")

    prompt += `\n\nAdditional company context:\n${context}`
  }

  return prompt
}
