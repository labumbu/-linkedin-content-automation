export type SourceTier = 1 | 2 | 3 | 4

export interface DataPoint {
  stat: string
  context: string
  source_name: string
  source_url: string
  year: number | null
  tier: SourceTier
}

export interface TierSourceCount {
  tier: 1 | 2 | 3
  count: number
  urls: string[]
}

export interface EvidenceDensity {
  tier_sources: TierSourceCount[]
  total_data_points: number
  tier1_data_points: number
  tier2_data_points: number
  recommended_pages: 2 | 3 | 4 | 5
  recommended_sections: string[]
}

export interface SourceEntry {
  tier: 1 | 2 | 3
  author_or_org: string
  title: string
  publisher?: string
  year: number | null
  url: string
  accessed_month_year: string
  used_in_sections: string[]
}

export interface HeadlineStat {
  stat: string
  context: string
  source_tier: 1 | 2 | null
  source_name: string
}

export interface ExecutiveSummarySection {
  topic: string
  one_paragraph_summary: string
  headline_stats: HeadlineStat[]
  key_takeaway: string
}

export interface ComparisonRow {
  dimension: string
  current_state: string
  emerging_state: string
  implication: string
}

export interface ComparisonSection {
  title: string
  comparison_rows: ComparisonRow[]
}

export interface Study {
  citation: string
  finding: string
  sample_size?: string
  source_tier: 1 | 2 | 3
}

export interface EvidenceSection {
  title: string
  studies: Study[]
  synthesis_paragraph: string
}

export interface Gap {
  gap: string
  why_it_matters: string
  harvey_angle: string
}

export interface GapSection {
  title: string
  gaps: Gap[]
}

export interface ConclusionSection {
  title: string
  strategic_summary: string
  recommendations: string[]
  harvey_cta: string
}

export interface SourcesPage {
  methodology_note: string
  sources: SourceEntry[]
  total_sources: number
  tier1_count: number
  tier2_count: number
  tier3_count: number
}

export interface ReportMetadata {
  omitted_sections?: string[]
  omission_reasons?: string[]
}

export interface ReportJSON {
  topic: string
  generated_at: string
  evidence_density: EvidenceDensity
  report_metadata?: ReportMetadata
  executive_summary: ExecutiveSummarySection
  comparison_section?: ComparisonSection
  evidence_section?: EvidenceSection
  gap_section?: GapSection
  conclusion?: ConclusionSection
  sources_page: SourcesPage
}

// SSE event types from /api/research/run
export type ResearchSSEEvent =
  | { type: "stage_complete"; stage: 1 | 2 | 3 | 4 | 5; message: string }
  | { type: "evidence_assessed"; evidence_density: EvidenceDensity }
  | { type: "synthesis_complete"; report: ReportJSON }
  | { type: "error"; message: string }
