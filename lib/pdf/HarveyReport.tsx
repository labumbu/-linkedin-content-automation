import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
} from "@react-pdf/renderer"
import {
  ReportJSON,
  ComparisonSection,
  EvidenceSection,
  GapSection,
  ConclusionSection,
  SourcesPage as SourcesPageType,
  HeadlineStat,
} from "@/lib/research-types"

// Harvey brand colours — hardcoded hex (CSS variables unavailable in react-pdf)
const C = {
  indigoHeader: "#1E1B4B",
  indigoPrimary: "#4F46E5",
  indigoLight: "#818CF8",
  indigoMuted: "#C7D2FE",
  white: "#FFFFFF",
  dark: "#111827",
  slate: "#374151",
  muted: "#6B7280",
  mutedLight: "#9CA3AF",
  border: "#E5E7EB",
  bg: "#F9FAFB",
  green: "#059669",
  amber: "#D97706",
  red: "#DC2626",
  tier1: "#4F46E5",
  tier2: "#818CF8",
  tier3: "#9CA3AF",
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C.dark,
    backgroundColor: C.white,
    paddingBottom: 40,
  },
  headerBand: {
    backgroundColor: C.indigoHeader,
    paddingHorizontal: 32,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerBrandName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: C.white,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 8,
    color: C.indigoMuted,
    letterSpacing: 0.5,
  },
  body: {
    paddingHorizontal: 32,
    paddingTop: 20,
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: C.mutedLight,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: C.indigoPrimary,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.indigoMuted,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
    color: C.slate,
    marginBottom: 10,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginVertical: 10,
  },
  // Stat callout boxes
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  statBox: {
    width: "30%",
    backgroundColor: C.bg,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: C.indigoPrimary,
    padding: 10,
    minHeight: 80,
  },
  statNumber: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: C.indigoPrimary,
    marginBottom: 2,
  },
  statContext: {
    fontSize: 8,
    color: C.slate,
    lineHeight: 1.4,
    marginBottom: 4,
  },
  statCitation: {
    fontSize: 7,
    color: C.muted,
    fontFamily: "Helvetica-Oblique",
    marginBottom: 3,
  },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  confidenceDots: {
    fontSize: 8,
  },
  confidenceLabel: {
    fontSize: 7,
    color: C.muted,
  },
  keyTakeaway: {
    backgroundColor: "#EEF2FF",
    borderRadius: 4,
    padding: 10,
    marginTop: 4,
  },
  keyTakeawayLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: C.indigoPrimary,
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  keyTakeawayText: {
    fontSize: 10,
    color: C.slate,
    lineHeight: 1.4,
  },
  // Comparison table
  table: {
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.indigoHeader,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: C.white,
    flex: 1,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableRowAlt: {
    backgroundColor: C.bg,
  },
  tableCell: {
    fontSize: 9,
    color: C.slate,
    flex: 1,
    lineHeight: 1.4,
    paddingRight: 4,
  },
  tableCellBold: {
    fontFamily: "Helvetica-Bold",
  },
  // Evidence study blocks
  studyBlock: {
    borderLeftWidth: 2,
    borderLeftColor: C.indigoLight,
    paddingLeft: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  studyCitation: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: C.indigoPrimary,
    marginBottom: 2,
  },
  studyFinding: {
    fontSize: 10,
    color: C.dark,
    lineHeight: 1.5,
    marginBottom: 3,
  },
  studySampleSize: {
    fontSize: 8,
    color: C.muted,
    fontFamily: "Helvetica-Oblique",
  },
  tierBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  // Gap section
  gapRow: {
    marginBottom: 12,
  },
  gapTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: C.dark,
    marginBottom: 3,
  },
  gapWhy: {
    fontSize: 9,
    color: C.slate,
    lineHeight: 1.4,
    marginBottom: 3,
  },
  gapHarvey: {
    fontSize: 9,
    color: C.indigoPrimary,
    fontFamily: "Helvetica-Oblique",
    lineHeight: 1.4,
  },
  // Conclusion
  recommendationRow: {
    flexDirection: "row",
    marginBottom: 5,
    gap: 6,
  },
  recommendationNumber: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: C.indigoPrimary,
    width: 14,
  },
  recommendationText: {
    fontSize: 10,
    color: C.slate,
    lineHeight: 1.4,
    flex: 1,
  },
  harveyCta: {
    backgroundColor: C.indigoPrimary,
    borderRadius: 4,
    padding: 12,
    marginTop: 12,
  },
  harveyCtaText: {
    fontSize: 10,
    color: C.white,
    lineHeight: 1.5,
  },
  // Sources page
  sourcesMethodologyNote: {
    fontSize: 9,
    color: C.slate,
    fontFamily: "Helvetica-Oblique",
    lineHeight: 1.5,
    marginBottom: 10,
  },
  evidenceQualityRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  tierCountBadge: {
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tierCountText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  tierGroupLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: C.indigoPrimary,
    marginTop: 10,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sourceEntry: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 8,
  },
  sourceTierBadge: {
    fontSize: 9,
    width: 20,
  },
  sourceEntryContent: {
    flex: 1,
  },
  sourceAuthor: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: C.dark,
  },
  sourceTitle: {
    fontSize: 9,
    color: C.slate,
    fontFamily: "Helvetica-Oblique",
    lineHeight: 1.4,
  },
  sourceMeta: {
    fontSize: 8,
    color: C.muted,
    marginTop: 1,
  },
  sourceUrl: {
    fontSize: 7,
    color: C.indigoPrimary,
    marginTop: 1,
  },
})

// ── Helpers ────────────────────────────────────────────────────────────────

function getTierDots(tier: 1 | 2 | null): { dots: string; color: string; label: string } {
  if (tier === 1) return { dots: "●●●", color: C.tier1, label: "Analyst/Academic" }
  if (tier === 2) return { dots: "●●", color: C.tier2, label: "Vendor Research" }
  return { dots: "●", color: C.tier3, label: "Trade Press" }
}

function getTierLabel(tier: 1 | 2 | 3): string {
  if (tier === 1) return "●●●"
  if (tier === 2) return "●●"
  return "●"
}

function getTierColor(tier: 1 | 2 | 3): string {
  if (tier === 1) return C.tier1
  if (tier === 2) return C.tier2
  return C.tier3
}

function PageHeader({ topic, subtitle }: { topic: string; subtitle?: string }) {
  return (
    <View style={styles.headerBand}>
      <Text style={styles.headerBrandName}>HARVEY</Text>
      <View style={{ flex: 1, marginLeft: 16 }}>
        <Text style={{ fontSize: 9, color: C.indigoMuted, fontFamily: "Helvetica-Bold" }}>
          {topic}
        </Text>
        {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
      <Text style={{ fontSize: 7, color: C.indigoMuted }}>Research Intelligence Report</Text>
    </View>
  )
}

function PageFooter({ pageLabel }: { pageLabel: string }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>Harvey Research Intelligence · Confidential</Text>
      <Text style={styles.footerText}>{pageLabel}</Text>
    </View>
  )
}

// ── Page components ────────────────────────────────────────────────────────

function ExecutiveSummaryPage({ report }: { report: ReportJSON }) {
  const es = report.executive_summary
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader topic={es.topic} subtitle="Executive Summary" />
      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <Text style={styles.paragraph}>{es.one_paragraph_summary}</Text>

        <Text style={[styles.paragraph, { fontFamily: "Helvetica-Bold", fontSize: 9, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }]}>
          Headline Statistics
        </Text>

        <View style={styles.statGrid}>
          {es.headline_stats.map((stat: HeadlineStat, i: number) => {
            const tierInfo = getTierDots(stat.source_tier)
            return (
              <View key={i} style={styles.statBox}>
                <Text style={styles.statNumber}>{stat.stat}</Text>
                <Text style={styles.statContext}>{stat.context}</Text>
                <Text style={styles.statCitation}>{stat.source_name}</Text>
                <View style={styles.confidenceRow}>
                  <Text style={[styles.confidenceDots, { color: tierInfo.color }]}>{tierInfo.dots}</Text>
                  <Text style={styles.confidenceLabel}>{tierInfo.label}</Text>
                </View>
              </View>
            )
          })}
        </View>

        <View style={styles.keyTakeaway}>
          <Text style={styles.keyTakeawayLabel}>Key Takeaway</Text>
          <Text style={styles.keyTakeawayText}>{es.key_takeaway}</Text>
        </View>
      </View>
      <PageFooter pageLabel="Page 1" />
    </Page>
  )
}

function ComparisonPage({ section }: { section: ComparisonSection }) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader topic={section.title} subtitle="Market Comparison" />
      <View style={styles.body}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Dimension</Text>
            <Text style={styles.tableHeaderCell}>Current State</Text>
            <Text style={styles.tableHeaderCell}>Emerging State</Text>
            <Text style={styles.tableHeaderCell}>Implication</Text>
          </View>
          {section.comparison_rows.map((row, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, styles.tableCellBold]}>{row.dimension}</Text>
              <Text style={styles.tableCell}>{row.current_state}</Text>
              <Text style={styles.tableCell}>{row.emerging_state}</Text>
              <Text style={styles.tableCell}>{row.implication}</Text>
            </View>
          ))}
        </View>
      </View>
      <PageFooter pageLabel="Comparison" />
    </Page>
  )
}

function EvidencePage({ section }: { section: EvidenceSection }) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader topic={section.title} subtitle="Evidence Review" />
      <View style={styles.body}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        {section.studies.map((study, i) => (
          <View key={i} style={styles.studyBlock}>
            <View style={styles.tierBadgeRow}>
              <Text style={[styles.confidenceDots, { color: getTierColor(study.source_tier), fontSize: 9 }]}>
                {getTierLabel(study.source_tier)}
              </Text>
              <Text style={styles.studyCitation}>{study.citation}</Text>
            </View>
            <Text style={styles.studyFinding}>{study.finding}</Text>
            {study.sample_size && (
              <Text style={styles.studySampleSize}>Sample: {study.sample_size}</Text>
            )}
          </View>
        ))}
        <View style={styles.divider} />
        <Text style={styles.paragraph}>{section.synthesis_paragraph}</Text>
      </View>
      <PageFooter pageLabel="Evidence" />
    </Page>
  )
}

function GapPage({ section }: { section: GapSection }) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader topic={section.title} subtitle="Gap Analysis" />
      <View style={styles.body}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        {section.gaps.map((gap, i) => (
          <View key={i} style={styles.gapRow}>
            <Text style={styles.gapTitle}>{i + 1}. {gap.gap}</Text>
            <Text style={styles.gapWhy}>{gap.why_it_matters}</Text>
            <Text style={styles.gapHarvey}>{gap.harvey_angle}</Text>
          </View>
        ))}
      </View>
      <PageFooter pageLabel="Gap Analysis" />
    </Page>
  )
}

function ConclusionPage({ section }: { section: ConclusionSection }) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader topic={section.title} subtitle="Conclusion" />
      <View style={styles.body}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.paragraph}>{section.strategic_summary}</Text>
        <Text style={[styles.paragraph, { fontFamily: "Helvetica-Bold", fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }]}>
          Recommendations
        </Text>
        {section.recommendations.map((rec, i) => (
          <View key={i} style={styles.recommendationRow}>
            <Text style={styles.recommendationNumber}>{i + 1}.</Text>
            <Text style={styles.recommendationText}>{rec}</Text>
          </View>
        ))}
        <View style={styles.harveyCta}>
          <Text style={styles.harveyCtaText}>{section.harvey_cta}</Text>
        </View>
      </View>
      <PageFooter pageLabel="Conclusion" />
    </Page>
  )
}

function SourcesPage({ page }: { page: SourcesPageType }) {
  const tier1Sources = page.sources.filter(s => s.tier === 1)
  const tier2Sources = page.sources.filter(s => s.tier === 2)
  const tier3Sources = page.sources.filter(s => s.tier === 3)

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader topic="Sources & Methodology" />
      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Sources & Methodology</Text>
        <Text style={styles.sourcesMethodologyNote}>{page.methodology_note}</Text>

        {/* Evidence quality summary */}
        <View style={styles.evidenceQualityRow}>
          {page.tier1_count > 0 && (
            <View style={[styles.tierCountBadge, { backgroundColor: "#EEF2FF" }]}>
              <Text style={[styles.confidenceDots, { color: C.tier1, fontSize: 9 }]}>●●●</Text>
              <Text style={[styles.tierCountText, { color: C.tier1 }]}>{page.tier1_count} Tier 1</Text>
            </View>
          )}
          {page.tier2_count > 0 && (
            <View style={[styles.tierCountBadge, { backgroundColor: "#F5F3FF" }]}>
              <Text style={[styles.confidenceDots, { color: C.tier2, fontSize: 9 }]}>●●</Text>
              <Text style={[styles.tierCountText, { color: C.tier2 }]}>{page.tier2_count} Tier 2</Text>
            </View>
          )}
          {page.tier3_count > 0 && (
            <View style={[styles.tierCountBadge, { backgroundColor: C.bg }]}>
              <Text style={[styles.confidenceDots, { color: C.tier3, fontSize: 9 }]}>●</Text>
              <Text style={[styles.tierCountText, { color: C.tier3 }]}>{page.tier3_count} Tier 3</Text>
            </View>
          )}
        </View>

        {/* Tier 1 sources */}
        {tier1Sources.length > 0 && (
          <>
            <Text style={styles.tierGroupLabel}>Tier 1 — Analyst & Academic Research</Text>
            {tier1Sources.map((source, i) => (
              <View key={i} style={styles.sourceEntry}>
                <Text style={[styles.sourceTierBadge, { color: C.tier1 }]}>●●●</Text>
                <View style={styles.sourceEntryContent}>
                  <Text style={styles.sourceAuthor}>{source.author_or_org}</Text>
                  <Text style={styles.sourceTitle}>{source.title}{source.publisher ? `. ${source.publisher}` : ""}</Text>
                  <Text style={styles.sourceMeta}>
                    {source.year ?? "n.d."} · Accessed {source.accessed_month_year} · Tier 1 · Peer-reviewed / Analyst
                  </Text>
                  <Link src={source.url} style={styles.sourceUrl}>{source.url.length > 70 ? source.url.slice(0, 70) + "…" : source.url}</Link>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Tier 2 sources */}
        {tier2Sources.length > 0 && (
          <>
            <Text style={styles.tierGroupLabel}>Tier 2 — Vendor Research with Methodology</Text>
            {tier2Sources.map((source, i) => (
              <View key={i} style={styles.sourceEntry}>
                <Text style={[styles.sourceTierBadge, { color: C.tier2 }]}>●●</Text>
                <View style={styles.sourceEntryContent}>
                  <Text style={styles.sourceAuthor}>{source.author_or_org}</Text>
                  <Text style={styles.sourceTitle}>{source.title}{source.publisher ? `. ${source.publisher}` : ""}</Text>
                  <Text style={styles.sourceMeta}>
                    {source.year ?? "n.d."} · Accessed {source.accessed_month_year} · Tier 2 · Vendor Research
                  </Text>
                  <Link src={source.url} style={styles.sourceUrl}>{source.url.length > 70 ? source.url.slice(0, 70) + "…" : source.url}</Link>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Tier 3 sources */}
        {tier3Sources.length > 0 && (
          <>
            <Text style={styles.tierGroupLabel}>Tier 3 — Trade Press & Practitioners</Text>
            {tier3Sources.map((source, i) => (
              <View key={i} style={styles.sourceEntry}>
                <Text style={[styles.sourceTierBadge, { color: C.tier3 }]}>●</Text>
                <View style={styles.sourceEntryContent}>
                  <Text style={styles.sourceAuthor}>{source.author_or_org}</Text>
                  <Text style={styles.sourceTitle}>{source.title}{source.publisher ? `. ${source.publisher}` : ""}</Text>
                  <Text style={styles.sourceMeta}>
                    {source.year ?? "n.d."} · Accessed {source.accessed_month_year} · Tier 3 · Trade Press
                  </Text>
                  <Link src={source.url} style={styles.sourceUrl}>{source.url.length > 70 ? source.url.slice(0, 70) + "…" : source.url}</Link>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
      <PageFooter pageLabel="Sources" />
    </Page>
  )
}

// ── Main document ──────────────────────────────────────────────────────────

export function HarveyReport({ report }: { report: ReportJSON }) {
  return (
    <Document
      title={`Harvey Research — ${report.topic}`}
      author="Harvey Research Intelligence"
      subject={report.topic}
    >
      <ExecutiveSummaryPage report={report} />

      {(report.comparison_section?.comparison_rows?.length ?? 0) > 0 && (
        <ComparisonPage section={report.comparison_section!} />
      )}

      {(report.evidence_section?.studies?.length ?? 0) > 0 && (
        <EvidencePage section={report.evidence_section!} />
      )}

      {(report.gap_section?.gaps?.length ?? 0) >= 3 && (
        <GapPage section={report.gap_section!} />
      )}

      {report.conclusion && (
        <ConclusionPage section={report.conclusion} />
      )}

      <SourcesPage page={report.sources_page} />
    </Document>
  )
}
