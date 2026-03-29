export interface Trend {
  id: string
  title: string
  summary: string
  source: "Web Search" | "Twitter" | "Reddit" | "LinkedIn"
  relevanceScore: number
  velocity: "hot" | "rising" | "stable"
}

export interface GeneratedPost {
  id: string
  content: string
  characterCount: number
}

export type Language = "EN" | "RU"
export type Tone = "Direct & Bold" | "Data-Driven" | "Contrarian" | "Storytelling"
