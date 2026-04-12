export interface Trend {
  id: string
  title: string
  summary: string
  source: "Web Search" | "Twitter" | "Reddit" | "LinkedIn"
  relevanceScore: number
  velocity: "hot" | "rising" | "stable"
  upvotes?: number
  comments?: number
  source_url?: string
  found_at?: string
}

export interface CarouselSlide {
  slide: number
  title: string
  body: string
}

export interface GeneratedPost {
  id: string
  dbId?: string   // Supabase UUID, set after saving
  content: string
  characterCount: number
  hookAlternatives?: string[]
  ctaNote?: string
  format?: "text" | "carousel"
  slides?: CarouselSlide[]
}

export type Language = "EN" | "RU"
export type Tone = "Direct & Bold" | "Data-Driven" | "Contrarian" | "Storytelling" | "HOW TO" | "WHAT TO"
export type PostSize = "Short" | "Medium" | "Long" | "Carousel"
export type HumanityLevel = 1 | 2 | 3 | 4 | 5
