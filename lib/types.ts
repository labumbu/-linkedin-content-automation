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

export interface DigestSource {
  title: string
  url: string
  publication: string
  tier?: "analyst" | "vendor" | "media"
}

export interface WebFinding {
  signal: string
  soWhat: string
  nowWhat: string
  tier: "analyst" | "vendor" | "media"
  velocity?: "hot" | "rising" | "stable"
  publication?: string
}

export interface PainPoint {
  painPoint: string
  evidence?: string
  practitionerQuote?: string
}

export interface HarveyRelevancePoint {
  finding: string
  harveyAdvantage: string
  urgency: "high" | "medium" | "low"
  talkingPoint?: string
}

export interface Recommendation {
  action: string
  rationale: string
  timeframe: "this week" | "this month" | "this quarter"
  priority: "critical" | "high" | "medium"
}

export interface CriticalFinding {
  finding: string
  implication: string
}

export interface DigestResult {
  weekRange: string
  generatedAt: string
  webCount: number
  redditCount: number
  totalComments: number
  totalUpvotes: number
  executiveSummary: {
    headline: string
    executiveOverview: string
    criticalFindings: CriticalFinding[]
    marketOutlook: string
    topRecommendation: string
    recommendations: Recommendation[]
    signalStrength: "strong" | "moderate" | "weak"
    signalStrengthReason: string
  }
  webSynthesis: {
    headline: string
    marketMovement?: string
    keyFindings: WebFinding[] | string[]
    trendingTopics: string[]
    notableStats: string[]
    marketRisks?: string[]
    sources: DigestSource[]
  }
  redditPulse: {
    headline: string
    overallSentiment?: string
    sentimentDriver?: string
    communityPainPoints: PainPoint[] | string[]
    subredditBreakdown?: { name: string; postCount: number; dominantTheme: string }[]
    topDiscussions: { title: string; upvotes: number; comments: number; url: string; whyItMatters?: string }[]
    sentiment: "positive" | "neutral" | "negative" | "mixed"
    keyInsights: string[]
    buyerSignals?: string[]
  }
  harveyAngle: {
    headline: string
    marketOpportunity?: string
    competitiveContext?: string
    relevancePoints: HarveyRelevancePoint[] | string[]
    winConditions?: string[]
    threatSignals?: string[]
    callToAction: string
  }
}

export type Language = "EN" | "RU"
export type Tone = "Direct & Bold" | "Data-Driven" | "Contrarian" | "Storytelling" | "HOW TO" | "WHAT TO"
export type PostSize = "Short" | "Medium" | "Long" | "Carousel"
export type HumanityLevel = 1 | 2 | 3 | 4 | 5
