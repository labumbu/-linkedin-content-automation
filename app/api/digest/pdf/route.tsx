import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer, Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"
import { DigestResult, WebFinding, PainPoint, HarveyRelevancePoint } from "@/lib/types"

export type PdfTheme = "dark" | "light" | "navy" | "forest"

interface ThemeTokens {
  pageBg: string
  accent: string
  textPrimary: string
  textMuted: string
  badgeBg: string
  divider: string
  statBoxBg: string
  labelColor: string
  footerColor: string
  cardBg: string
  criticalBorder: string
  highBorder: string
}

const THEMES: Record<PdfTheme, ThemeTokens> = {
  dark: {
    pageBg: "#0A0A0F", accent: "#6366F1", textPrimary: "#F8F8FF",
    textMuted: "#8B8BA8", badgeBg: "#13131A", divider: "#1E1E2E",
    statBoxBg: "#13131A", labelColor: "#6366F1", footerColor: "#4A4A6A",
    cardBg: "#0F0F18", criticalBorder: "#EF4444", highBorder: "#F59E0B",
  },
  light: {
    pageBg: "#FFFFFF", accent: "#6366F1", textPrimary: "#0F0F1A",
    textMuted: "#6B7280", badgeBg: "#F3F4F6", divider: "#E5E7EB",
    statBoxBg: "#F3F4F6", labelColor: "#6366F1", footerColor: "#9CA3AF",
    cardBg: "#F9FAFB", criticalBorder: "#EF4444", highBorder: "#F59E0B",
  },
  navy: {
    pageBg: "#0D1B2A", accent: "#F59E0B", textPrimary: "#F0F4F8",
    textMuted: "#8BAAB8", badgeBg: "#162434", divider: "#1E3045",
    statBoxBg: "#162434", labelColor: "#F59E0B", footerColor: "#4A7B95",
    cardBg: "#111E2C", criticalBorder: "#EF4444", highBorder: "#F59E0B",
  },
  forest: {
    pageBg: "#0D1F17", accent: "#10B981", textPrimary: "#ECFDF5",
    textMuted: "#6EE7B7", badgeBg: "#132B1E", divider: "#1A3D28",
    statBoxBg: "#132B1E", labelColor: "#10B981", footerColor: "#34A068",
    cardBg: "#102219", criticalBorder: "#EF4444", highBorder: "#F59E0B",
  },
}

const PW = 595
const PH = 842
const PAD = 44

// Backward-compat helpers
function getFindingText(item: WebFinding | string): { signal: string; soWhat: string; nowWhat: string; tier?: string; velocity?: string } {
  if (typeof item === "string") return { signal: item, soWhat: "", nowWhat: "", tier: "media" }
  return item
}

function getPainPointText(item: PainPoint | string): { painPoint: string; evidence?: string; practitionerQuote?: string } {
  if (typeof item === "string") return { painPoint: item }
  return item
}

function getRelevancePointText(item: HarveyRelevancePoint | string): { finding: string; harveyAdvantage: string; urgency?: string; talkingPoint?: string } {
  if (typeof item === "string") return { finding: item, harveyAdvantage: "", urgency: "medium" }
  return item
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    page: { width: PW, height: PH, backgroundColor: t.pageBg, fontFamily: "Helvetica", padding: 0 },
    stripe: { position: "absolute", top: 0, left: 0, right: 0, height: 4, backgroundColor: t.accent },
    body: { paddingHorizontal: PAD, paddingTop: 36, paddingBottom: 48 },
    pageNum: { position: "absolute", top: 18, right: PAD, fontSize: 9, color: t.footerColor },
    footer: { position: "absolute", bottom: 18, left: PAD, right: PAD, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 8, color: t.footerColor },
    divider: { height: 1, backgroundColor: t.divider, marginVertical: 16 },
    // Labels & titles
    sectionLabel: { fontSize: 8, color: t.labelColor, fontFamily: "Helvetica-Bold", letterSpacing: 2, marginBottom: 8 },
    sectionTitle: { fontSize: 20, color: t.textPrimary, fontFamily: "Helvetica-Bold", lineHeight: 1.3, marginBottom: 16 },
    subTitle: { fontSize: 13, color: t.textPrimary, fontFamily: "Helvetica-Bold", marginBottom: 10 },
    bodyText: { fontSize: 11, color: t.textMuted, fontFamily: "Helvetica", lineHeight: 1.6 },
    // Cover
    coverContainer: { paddingHorizontal: PAD, paddingTop: 100, flex: 1 },
    coverBrand: { fontSize: 11, color: t.accent, fontFamily: "Helvetica-Bold", letterSpacing: 3, marginBottom: 20 },
    coverTitle: { fontSize: 34, color: t.textPrimary, fontFamily: "Helvetica-Bold", lineHeight: 1.2, marginBottom: 8 },
    coverSubtitle: { fontSize: 14, color: t.textMuted, marginBottom: 12 },
    signalBadge: { alignSelf: "flex-start", borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 24 },
    signalBadgeText: { fontSize: 10, fontFamily: "Helvetica-Bold" },
    statsRow: { flexDirection: "row", gap: 12, marginTop: 12 },
    statBox: { flex: 1, backgroundColor: t.statBoxBg, borderRadius: 6, padding: 14 },
    statNum: { fontSize: 22, color: t.accent, fontFamily: "Helvetica-Bold", marginBottom: 4 },
    statLabel: { fontSize: 9, color: t.textMuted },
    overviewBoxWrapper: { flexDirection: "row", marginTop: 20 },
    overviewBoxAccent: { width: 3, backgroundColor: t.accent, borderRadius: 2 },
    overviewBox: { flex: 1, backgroundColor: t.cardBg, borderRadius: 6, padding: 16, marginLeft: 1 },
    overviewText: { fontSize: 11, color: t.textPrimary, fontFamily: "Helvetica", lineHeight: 1.6 },
    // Exec summary
    criticalFindingRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
    criticalFindingBox: { flex: 1, backgroundColor: t.cardBg, borderRadius: 6, padding: 12 },
    criticalFindingLabel: { fontSize: 8, color: t.accent, fontFamily: "Helvetica-Bold", letterSpacing: 1, marginBottom: 4 },
    criticalFindingText: { fontSize: 10, color: t.textPrimary, fontFamily: "Helvetica-Bold", lineHeight: 1.4, marginBottom: 6 },
    implicationText: { fontSize: 9, color: t.textMuted, lineHeight: 1.5 },
    ctaBox: { backgroundColor: t.accent, borderRadius: 6, padding: 14, marginTop: 16 },
    ctaText: { fontSize: 12, color: "#FFFFFF", fontFamily: "Helvetica-Bold", lineHeight: 1.4 },
    outlookBox: { backgroundColor: t.cardBg, borderRadius: 6, padding: 14, marginTop: 12 },
    // Market signals (findings)
    findingCard: { backgroundColor: t.cardBg, borderRadius: 6, padding: 12, marginBottom: 10 },
    findingSignal: { fontSize: 11, color: t.textPrimary, fontFamily: "Helvetica-Bold", lineHeight: 1.4, marginBottom: 5 },
    findingRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 3 },
    findingArrow: { fontSize: 10, color: t.accent, width: 18, flexShrink: 0, marginTop: 1 },
    findingLabel: { fontSize: 9, color: t.accent, fontFamily: "Helvetica-Bold", width: 60, flexShrink: 0, marginTop: 1 },
    findingText: { fontSize: 10, color: t.textMuted, lineHeight: 1.5, flex: 1 },
    badgeRow: { flexDirection: "row", gap: 6, marginTop: 6 },
    tierBadge: { borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
    tierBadgeText: { fontSize: 8, fontFamily: "Helvetica-Bold" },
    velBadge: { borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: "#EF444420" },
    velBadgeText: { fontSize: 8, color: "#EF4444", fontFamily: "Helvetica-Bold" },
    statCallout: { backgroundColor: t.statBoxBg, borderRadius: 5, padding: 9, marginBottom: 7 },
    statCalloutText: { fontSize: 11, color: t.textPrimary, fontFamily: "Helvetica-Bold" },
    riskRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 7 },
    riskDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444", marginTop: 3, marginRight: 8, flexShrink: 0 },
    topicsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
    topicTag: { backgroundColor: t.badgeBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    topicTagText: { fontSize: 9, color: t.accent },
    // Community intelligence
    sentimentRow: { flexDirection: "row", gap: 8, marginBottom: 10, alignItems: "center" },
    sentimentBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
    sentimentText: { fontSize: 9, color: "#FFFFFF", fontFamily: "Helvetica-Bold" },
    sentimentDriver: { fontSize: 10, color: t.textMuted, flex: 1, lineHeight: 1.5 },
    painPointCard: { backgroundColor: t.cardBg, borderRadius: 5, padding: 10, marginBottom: 8 },
    painPointText: { fontSize: 11, color: t.textPrimary, fontFamily: "Helvetica-Bold", lineHeight: 1.4, marginBottom: 4 },
    evidenceText: { fontSize: 9, color: t.textMuted, lineHeight: 1.4, marginBottom: 3 },
    quoteText: { fontSize: 9, color: t.footerColor, lineHeight: 1.4 },
    tableHeader: { flexDirection: "row", paddingBottom: 5, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: t.divider },
    tableHeaderText: { fontSize: 8, color: t.footerColor, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
    tableRow: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: t.divider },
    tableRowTitle: { flex: 1, fontSize: 10, color: t.textMuted },
    tableRowStat: { fontSize: 10, color: t.accent, fontFamily: "Helvetica-Bold", width: 56, textAlign: "right" },
    subRedditRow: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: t.divider },
    subRedditName: { fontSize: 10, color: t.accent, fontFamily: "Helvetica-Bold", width: 100, flexShrink: 0 },
    subRedditCount: { fontSize: 10, color: t.textMuted, width: 40, textAlign: "right", flexShrink: 0 },
    subRedditTheme: { fontSize: 10, color: t.textMuted, flex: 1, paddingLeft: 12, lineHeight: 1.4 },
    // Strategic implications
    urgencyRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
    urgencyDot: { width: 16, height: 16, borderRadius: 8, marginTop: 2, marginRight: 10, flexShrink: 0, alignItems: "center", justifyContent: "center" },
    urgencyNum: { fontSize: 8, color: "#FFFFFF", fontFamily: "Helvetica-Bold" },
    urgencyContent: { flex: 1 },
    urgencyFinding: { fontSize: 10, color: t.textMuted, marginBottom: 3, lineHeight: 1.4 },
    urgencyAdvantage: { fontSize: 11, color: t.textPrimary, fontFamily: "Helvetica-Bold", lineHeight: 1.4, marginBottom: 3 },
    talkingPointText: { fontSize: 9, color: t.accent, lineHeight: 1.4 },
    winRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
    winCheck: { fontSize: 10, color: "#10B981", width: 16, flexShrink: 0 },
    winText: { fontSize: 10, color: t.textMuted, flex: 1, lineHeight: 1.5 },
    contextBox: { backgroundColor: t.cardBg, borderRadius: 6, padding: 12, marginBottom: 16 },
    contextText: { fontSize: 10, color: t.textMuted, lineHeight: 1.6 },
    // Recommendations
    recRow: { flexDirection: "row", marginBottom: 10 },
    recPriorityBar: { width: 4, flexShrink: 0 },
    recContent: { flex: 1, backgroundColor: t.cardBg, padding: 10 },
    recAction: { fontSize: 11, color: t.textPrimary, fontFamily: "Helvetica-Bold", lineHeight: 1.4, marginBottom: 3 },
    recRationale: { fontSize: 10, color: t.textMuted, lineHeight: 1.4, marginBottom: 4 },
    recMeta: { flexDirection: "row", gap: 8 },
    recPriorityBadge: { borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
    recPriorityText: { fontSize: 8, fontFamily: "Helvetica-Bold" },
    recTimeframe: { borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: t.badgeBg },
    recTimeframeText: { fontSize: 8, color: t.textMuted },
    // Sources
    sourceRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
    sourcePub: { fontSize: 10, color: t.accent, fontFamily: "Helvetica-Bold", width: 110, flexShrink: 0 },
    sourceDetails: { flex: 1 },
    sourceTitle: { fontSize: 10, color: t.textPrimary, marginBottom: 2, lineHeight: 1.4 },
    sourceUrl: { fontSize: 8, color: t.footerColor },
    sourceTierBadge: { borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 6, alignSelf: "flex-start" },
    sourceTierText: { fontSize: 7, fontFamily: "Helvetica-Bold" },
    methodBox: { backgroundColor: t.cardBg, borderRadius: 6, padding: 12, marginTop: 12 },
    methodText: { fontSize: 9, color: t.footerColor, lineHeight: 1.6 },
  })
}

function Footer({ s, page, total, date }: { s: ReturnType<typeof makeStyles>; page: number; total: number; date: string }) {
  return (
    <View style={s.footer}>
      <Text style={s.footerText}>harvey.ai · Weekly Market Intelligence</Text>
      <Text style={s.footerText}>{date} · Page {page}/{total}</Text>
    </View>
  )
}

const SIGNAL_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  strong: { bg: "#10B98120", text: "#10B981", label: "STRONG SIGNAL WEEK" },
  moderate: { bg: "#F59E0B20", text: "#F59E0B", label: "MODERATE SIGNAL" },
  weak: { bg: "#6B728020", text: "#6B7280", label: "LOW SIGNAL" },
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#10B981", negative: "#EF4444", neutral: "#6B7280", mixed: "#F59E0B",
}

const URGENCY_COLORS: Record<string, string> = {
  high: "#EF4444", medium: "#F59E0B", low: "#6B7280",
}

const TIER_STYLES: Record<string, { bg: string; color: string }> = {
  analyst: { bg: "#6366F120", color: "#6366F1" },
  vendor: { bg: "#F59E0B15", color: "#F59E0B" },
  media: { bg: "#6B728018", color: "#6B7280" },
}

function CoverPage({ digest, t, date }: { digest: DigestResult; t: ThemeTokens; date: string }) {
  const s = makeStyles(t)
  const sig = digest.executiveSummary?.signalStrength ?? "moderate"
  const sigColors = SIGNAL_COLORS[sig] ?? SIGNAL_COLORS.moderate
  return (
    <Page size={[PW, PH]} style={s.page}>
      <View style={s.stripe} />
      <View style={s.coverContainer}>
        <Text style={s.coverBrand}>HARVEY AI</Text>
        <Text style={s.coverTitle}>Weekly Market{"\n"}Intelligence</Text>
        <Text style={s.coverSubtitle}>{digest.weekRange}</Text>
        <View style={[s.signalBadge, { backgroundColor: sigColors.bg }]}>
          <Text style={[s.signalBadgeText, { color: sigColors.text }]}>● {sigColors.label}</Text>
        </View>
        <View style={s.divider} />
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{digest.webCount}</Text>
            <Text style={s.statLabel}>Web Articles</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNum}>{digest.redditCount}</Text>
            <Text style={s.statLabel}>Reddit Posts</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNum}>{digest.totalUpvotes.toLocaleString()}</Text>
            <Text style={s.statLabel}>Upvotes</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNum}>{digest.totalComments.toLocaleString()}</Text>
            <Text style={s.statLabel}>Comments</Text>
          </View>
        </View>
        {digest.executiveSummary?.executiveOverview && (
          <View style={s.overviewBoxWrapper}>
            <View style={s.overviewBoxAccent} />
            <View style={s.overviewBox}>
              <Text style={s.overviewText}>{digest.executiveSummary.executiveOverview}</Text>
            </View>
          </View>
        )}
      </View>
      <Footer s={s} page={1} total={6} date={date} />
    </Page>
  )
}

function ExecSummaryPage({ digest, t, date }: { digest: DigestResult; t: ThemeTokens; date: string }) {
  const s = makeStyles(t)
  const exec = digest.executiveSummary
  if (!exec) return null as unknown as JSX.Element
  const findings = exec.criticalFindings ?? []
  return (
    <Page size={[PW, PH]} style={s.page}>
      <View style={s.stripe} />
      <View style={s.body}>
        <Text style={s.sectionLabel}>EXECUTIVE SUMMARY</Text>
        <Text style={s.sectionTitle}>{exec.headline}</Text>
        {findings.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { marginBottom: 10 }]}>CRITICAL FINDINGS</Text>
            <View style={s.criticalFindingRow}>
              {findings.slice(0, 3).map((f, i) => (
                <View key={i} style={s.criticalFindingBox}>
                  <Text style={s.criticalFindingLabel}>FINDING {i + 1}</Text>
                  <Text style={s.criticalFindingText}>{f.finding}</Text>
                  <Text style={s.implicationText}>↳ {f.implication}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        {exec.marketOutlook && (
          <>
            <View style={s.divider} />
            <Text style={[s.sectionLabel, { marginBottom: 8 }]}>MARKET OUTLOOK</Text>
            <View style={s.outlookBox}>
              <Text style={s.bodyText}>{exec.marketOutlook}</Text>
            </View>
          </>
        )}
        {exec.topRecommendation && (
          <View style={s.ctaBox}>
            <Text style={[s.sectionLabel, { color: "#FFFFFF80", marginBottom: 6 }]}>TOP RECOMMENDATION</Text>
            <Text style={s.ctaText}>{exec.topRecommendation}</Text>
          </View>
        )}
        {exec.signalStrengthReason && (
          <Text style={[s.bodyText, { marginTop: 14, fontSize: 9 }]}>
            Signal quality: {exec.signalStrengthReason}
          </Text>
        )}
      </View>
      <Footer s={s} page={2} total={6} date={date} />
    </Page>
  )
}

function MarketSignalsPage({ digest, t, date }: { digest: DigestResult; t: ThemeTokens; date: string }) {
  const s = makeStyles(t)
  const { webSynthesis } = digest
  const findings = webSynthesis.keyFindings ?? []
  return (
    <Page size={[PW, PH]} style={s.page}>
      <View style={s.stripe} />
      <View style={s.body}>
        <Text style={s.sectionLabel}>MARKET SIGNALS</Text>
        <Text style={s.sectionTitle}>{webSynthesis.headline}</Text>
        {webSynthesis.marketMovement && (
          <Text style={[s.bodyText, { marginBottom: 16 }]}>{webSynthesis.marketMovement}</Text>
        )}
        {findings.slice(0, 5).map((item, i) => {
          const f = getFindingText(item)
          const tierStyle = TIER_STYLES[f.tier ?? "media"] ?? TIER_STYLES.media
          const isHot = f.velocity === "hot"
          const isRising = f.velocity === "rising"
          return (
            <View key={i} style={s.findingCard}>
              <Text style={s.findingSignal}>{f.signal}</Text>
              {f.soWhat ? (
                <View style={s.findingRow}>
                  <Text style={s.findingLabel}>SO WHAT</Text>
                  <Text style={s.findingText}>{f.soWhat}</Text>
                </View>
              ) : null}
              {f.nowWhat ? (
                <View style={s.findingRow}>
                  <Text style={[s.findingLabel, { color: t.textPrimary }]}>ACTION</Text>
                  <Text style={[s.findingText, { color: t.textPrimary }]}>{f.nowWhat}</Text>
                </View>
              ) : null}
              <View style={s.badgeRow}>
                <View style={[s.tierBadge, { backgroundColor: tierStyle.bg }]}>
                  <Text style={[s.tierBadgeText, { color: tierStyle.color }]}>
                    {f.tier === "analyst" ? "ANALYST" : f.tier === "vendor" ? "VENDOR" : "MEDIA"}
                  </Text>
                </View>
                {isHot && <View style={s.velBadge}><Text style={s.velBadgeText}>🔥 HOT</Text></View>}
                {isRising && <View style={[s.velBadge, { backgroundColor: "#F59E0B20" }]}><Text style={[s.velBadgeText, { color: "#F59E0B" }]}>↗ RISING</Text></View>}
                {f.publication && (
                  <View style={[s.tierBadge, { backgroundColor: t.badgeBg }]}>
                    <Text style={[s.tierBadgeText, { color: t.footerColor }]}>{f.publication}</Text>
                  </View>
                )}
              </View>
            </View>
          )
        })}
        {webSynthesis.notableStats?.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={[s.sectionLabel, { marginBottom: 8 }]}>KEY DATA POINTS</Text>
            {webSynthesis.notableStats.slice(0, 3).map((stat, i) => (
              <View key={i} style={s.statCallout}>
                <Text style={s.statCalloutText}>{stat}</Text>
              </View>
            ))}
          </>
        )}
        {webSynthesis.trendingTopics?.length > 0 && (
          <View style={s.topicsRow}>
            {webSynthesis.trendingTopics.map((topic, i) => (
              <View key={i} style={s.topicTag}>
                <Text style={s.topicTagText}>{topic}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Footer s={s} page={3} total={6} date={date} />
    </Page>
  )
}

function CommunityIntelligencePage({ digest, t, date }: { digest: DigestResult; t: ThemeTokens; date: string }) {
  const s = makeStyles(t)
  const { redditPulse } = digest
  const sentiment = (redditPulse.overallSentiment ?? redditPulse.sentiment ?? "mixed") as string
  const sentimentColor = SENTIMENT_COLORS[sentiment] ?? t.accent
  const painPoints = redditPulse.communityPainPoints ?? []
  const subreddits = redditPulse.subredditBreakdown ?? []
  return (
    <Page size={[PW, PH]} style={s.page}>
      <View style={s.stripe} />
      <View style={s.body}>
        <Text style={s.sectionLabel}>PRACTITIONER INTELLIGENCE</Text>
        <Text style={s.sectionTitle}>{redditPulse.headline}</Text>
        <View style={s.sentimentRow}>
          <View style={[s.sentimentBadge, { backgroundColor: sentimentColor }]}>
            <Text style={s.sentimentText}>{sentiment.toUpperCase()}</Text>
          </View>
          {redditPulse.sentimentDriver && (
            <Text style={s.sentimentDriver}>{redditPulse.sentimentDriver}</Text>
          )}
        </View>
        <Text style={[s.sectionLabel, { marginBottom: 8 }]}>PRACTITIONER PAIN POINTS</Text>
        {painPoints.slice(0, 4).map((item, i) => {
          const p = getPainPointText(item)
          return (
            <View key={i} style={s.painPointCard}>
              <Text style={s.painPointText}>{p.painPoint}</Text>
              {p.evidence && <Text style={s.evidenceText}>Source: {p.evidence}</Text>}
              {p.practitionerQuote && <Text style={s.quoteText}>"{p.practitionerQuote}"</Text>}
            </View>
          )
        })}
        {subreddits.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={[s.sectionLabel, { marginBottom: 8 }]}>COMMUNITY BREAKDOWN</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, { width: 100 }]}>SUBREDDIT</Text>
              <Text style={[s.tableHeaderText, { width: 40, textAlign: "right" }]}>POSTS</Text>
              <Text style={[s.tableHeaderText, { flex: 1, paddingLeft: 12 }]}>FOCUS THIS WEEK</Text>
            </View>
            {subreddits.slice(0, 4).map((sub, i) => (
              <View key={i} style={s.subRedditRow}>
                <Text style={s.subRedditName}>r/{sub.name}</Text>
                <Text style={s.subRedditCount}>{sub.postCount}</Text>
                <Text style={s.subRedditTheme}>{sub.dominantTheme}</Text>
              </View>
            ))}
          </>
        )}
        {redditPulse.topDiscussions?.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={[s.sectionLabel, { marginBottom: 8 }]}>TOP DISCUSSIONS</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, { flex: 1 }]}>THREAD</Text>
              <Text style={[s.tableHeaderText, { width: 52, textAlign: "right" }]}>UPVOTES</Text>
              <Text style={[s.tableHeaderText, { width: 52, textAlign: "right" }]}>COMMENTS</Text>
            </View>
            {redditPulse.topDiscussions.slice(0, 4).map((d, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={s.tableRowTitle}>{d.title.length > 75 ? d.title.slice(0, 75) + "…" : d.title}</Text>
                <Text style={s.tableRowStat}>{d.upvotes ?? 0}</Text>
                <Text style={s.tableRowStat}>{d.comments ?? 0}</Text>
              </View>
            ))}
          </>
        )}
      </View>
      <Footer s={s} page={4} total={6} date={date} />
    </Page>
  )
}

function StrategicImplicationsPage({ digest, t, date }: { digest: DigestResult; t: ThemeTokens; date: string }) {
  const s = makeStyles(t)
  const { harveyAngle } = digest
  const points = harveyAngle.relevancePoints ?? []
  return (
    <Page size={[PW, PH]} style={s.page}>
      <View style={s.stripe} />
      <View style={s.body}>
        <Text style={s.sectionLabel}>STRATEGIC IMPLICATIONS</Text>
        <Text style={s.sectionTitle}>{harveyAngle.headline}</Text>
        {(harveyAngle.marketOpportunity || harveyAngle.competitiveContext) && (
          <View style={s.contextBox}>
            {harveyAngle.marketOpportunity && (
              <Text style={[s.contextText, { marginBottom: 6 }]}>
                <Text style={{ color: t.textPrimary, fontFamily: "Helvetica-Bold" }}>Opportunity: </Text>
                {harveyAngle.marketOpportunity}
              </Text>
            )}
            {harveyAngle.competitiveContext && (
              <Text style={s.contextText}>
                <Text style={{ color: t.textPrimary, fontFamily: "Helvetica-Bold" }}>Competitive context: </Text>
                {harveyAngle.competitiveContext}
              </Text>
            )}
          </View>
        )}
        {points.slice(0, 5).map((item, i) => {
          const p = getRelevancePointText(item)
          const urgencyColor = URGENCY_COLORS[p.urgency ?? "medium"] ?? URGENCY_COLORS.medium
          return (
            <View key={i} style={s.urgencyRow}>
              <View style={[s.urgencyDot, { backgroundColor: urgencyColor }]}>
                <Text style={s.urgencyNum}>{i + 1}</Text>
              </View>
              <View style={s.urgencyContent}>
                <Text style={s.urgencyFinding}>{p.finding}</Text>
                <Text style={s.urgencyAdvantage}>{p.harveyAdvantage}</Text>
                {p.talkingPoint && (
                  <Text style={s.talkingPointText}>→ Rep talking point: {p.talkingPoint}</Text>
                )}
              </View>
            </View>
          )
        })}
        {harveyAngle.winConditions?.length ? (
          <>
            <View style={s.divider} />
            <Text style={[s.sectionLabel, { marginBottom: 8 }]}>WIN CONDITIONS THIS WEEK</Text>
            {harveyAngle.winConditions.map((w, i) => (
              <View key={i} style={s.winRow}>
                <Text style={s.winCheck}>✓</Text>
                <Text style={s.winText}>{w}</Text>
              </View>
            ))}
          </>
        ) : null}
        {harveyAngle.callToAction && (
          <View style={s.ctaBox}>
            <Text style={s.ctaText}>{harveyAngle.callToAction}</Text>
          </View>
        )}
      </View>
      <Footer s={s} page={5} total={6} date={date} />
    </Page>
  )
}

function RecommendationsSourcesPage({ digest, t, date }: { digest: DigestResult; t: ThemeTokens; date: string }) {
  const s = makeStyles(t)
  const exec = digest.executiveSummary
  const recs = exec?.recommendations ?? []
  const sources = digest.webSynthesis.sources ?? []
  const sorted = [...recs].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2 }
    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2)
  })
  return (
    <Page size={[PW, PH]} style={s.page}>
      <View style={s.stripe} />
      <View style={s.body}>
        {sorted.length > 0 && (
          <>
            <Text style={s.sectionLabel}>RECOMMENDATIONS</Text>
            <Text style={[s.sectionTitle, { marginBottom: 14 }]}>Actions for This Week</Text>
            {sorted.map((rec, i) => {
              const priorityColor = rec.priority === "critical" ? t.criticalBorder : rec.priority === "high" ? t.highBorder : t.textMuted
              const priorityBg = rec.priority === "critical" ? "#EF444420" : rec.priority === "high" ? "#F59E0B20" : t.badgeBg
              const priorityText = rec.priority === "critical" ? "#EF4444" : rec.priority === "high" ? "#F59E0B" : t.textMuted
              return (
                <View key={i} style={s.recRow}>
                  <View style={[s.recPriorityBar, { backgroundColor: priorityColor }]} />
                  <View style={s.recContent}>
                    <Text style={s.recAction}>{rec.action}</Text>
                    <Text style={s.recRationale}>{rec.rationale}</Text>
                    <View style={s.recMeta}>
                      <View style={[s.recPriorityBadge, { backgroundColor: priorityBg }]}>
                        <Text style={[s.recPriorityText, { color: priorityText }]}>{rec.priority.toUpperCase()}</Text>
                      </View>
                      <View style={s.recTimeframe}>
                        <Text style={s.recTimeframeText}>{rec.timeframe}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )
            })}
            <View style={s.divider} />
          </>
        )}
        <Text style={s.sectionLabel}>KEY SOURCES</Text>
        <Text style={[s.subTitle, { marginBottom: 12 }]}>Referenced This Week</Text>
        {sources.slice(0, 8).map((src, i) => {
          const tier = src.tier ?? "media"
          const ts = TIER_STYLES[tier] ?? TIER_STYLES.media
          return (
            <View key={i} style={s.sourceRow}>
              <Text style={s.sourcePub}>{src.publication}</Text>
              <View style={s.sourceDetails}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <Text style={[s.sourceTitle, { flex: 1 }]}>{src.title.length > 90 ? src.title.slice(0, 90) + "…" : src.title}</Text>
                  <View style={[s.sourceTierBadge, { backgroundColor: ts.bg }]}>
                    <Text style={[s.sourceTierText, { color: ts.color }]}>{tier.toUpperCase()}</Text>
                  </View>
                </View>
                {src.url && <Text style={s.sourceUrl}>{src.url.length > 75 ? src.url.slice(0, 75) + "…" : src.url}</Text>}
              </View>
            </View>
          )
        })}
        {sources.length === 0 && (
          <Text style={s.bodyText}>No web sources with URLs were available this week.</Text>
        )}
        <View style={s.methodBox}>
          <Text style={s.methodText}>
            Methodology: This report analyzed {digest.webCount} web articles and {digest.redditCount} Reddit posts
            from {digest.weekRange} using AI synthesis. Web signals ranked by source tier (Analyst · Vendor · Media)
            and trend velocity. Community intelligence weighted by engagement score (upvotes × 2 + comments × 3).
            Generated {new Date(digest.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
          </Text>
        </View>
      </View>
      <Footer s={s} page={6} total={6} date={date} />
    </Page>
  )
}

export async function POST(req: NextRequest) {
  const { digest, theme = "dark" } = await req.json() as { digest: DigestResult; theme?: PdfTheme }

  if (!digest) {
    return NextResponse.json({ error: "digest is required" }, { status: 400 })
  }

  const t = THEMES[theme] ?? THEMES.dark
  const date = new Date(digest.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  const doc = (
    <Document title={`Harvey Weekly Digest — ${digest.weekRange}`} author="Harvey Content Fabric">
      <CoverPage digest={digest} t={t} date={date} />
      <ExecSummaryPage digest={digest} t={t} date={date} />
      <MarketSignalsPage digest={digest} t={t} date={date} />
      <CommunityIntelligencePage digest={digest} t={t} date={date} />
      <StrategicImplicationsPage digest={digest} t={t} date={date} />
      <RecommendationsSourcesPage digest={digest} t={t} date={date} />
    </Document>
  )

  try {
    const buffer = await renderToBuffer(doc)
    const filename = `harvey-digest-${theme}-${digest.weekRange.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error("Digest PDF error:", err)
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 })
  }
}
