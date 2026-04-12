import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer, Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"
import { DigestResult } from "@/lib/types"

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
}

const THEMES: Record<PdfTheme, ThemeTokens> = {
  dark: {
    pageBg: "#0A0A0F", accent: "#6366F1", textPrimary: "#F8F8FF",
    textMuted: "#8B8BA8", badgeBg: "#13131A", divider: "#1E1E2E",
    statBoxBg: "#13131A", labelColor: "#6366F1", footerColor: "#4A4A6A",
  },
  light: {
    pageBg: "#FFFFFF", accent: "#6366F1", textPrimary: "#0F0F1A",
    textMuted: "#6B7280", badgeBg: "#F3F4F6", divider: "#E5E7EB",
    statBoxBg: "#F3F4F6", labelColor: "#6366F1", footerColor: "#9CA3AF",
  },
  navy: {
    pageBg: "#0D1B2A", accent: "#F59E0B", textPrimary: "#F0F4F8",
    textMuted: "#8BAAB8", badgeBg: "#162434", divider: "#1E3045",
    statBoxBg: "#162434", labelColor: "#F59E0B", footerColor: "#4A7B95",
  },
  forest: {
    pageBg: "#0D1F17", accent: "#10B981", textPrimary: "#ECFDF5",
    textMuted: "#6EE7B7", badgeBg: "#132B1E", divider: "#1A3D28",
    statBoxBg: "#132B1E", labelColor: "#10B981", footerColor: "#34A068",
  },
}

const PW = 595  // A4 width (pt)
const PH = 842  // A4 height (pt)
const PAD = 48

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    page: { width: PW, height: PH, backgroundColor: t.pageBg, fontFamily: "Helvetica", padding: 0 },
    stripe: { position: "absolute", top: 0, left: 0, right: 0, height: 4, backgroundColor: t.accent },
    body: { paddingHorizontal: PAD, paddingTop: 40, paddingBottom: 40 },
    // Page num
    pageNum: { position: "absolute", top: 20, right: PAD, fontSize: 9, color: t.footerColor, fontFamily: "Helvetica" },
    footer: { position: "absolute", bottom: 20, left: PAD, right: PAD, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 9, color: t.footerColor, fontFamily: "Helvetica" },
    // Cover
    coverContainer: { paddingHorizontal: PAD, paddingTop: 120, flex: 1 },
    coverBrand: { fontSize: 13, color: t.accent, fontFamily: "Helvetica-Bold", letterSpacing: 3, marginBottom: 24 },
    coverTitle: { fontSize: 36, color: t.textPrimary, fontFamily: "Helvetica-Bold", lineHeight: 1.2, marginBottom: 12 },
    coverSubtitle: { fontSize: 16, color: t.textMuted, fontFamily: "Helvetica", marginBottom: 48 },
    statsRow: { flexDirection: "row", gap: 16, marginTop: 16 },
    statBox: { flex: 1, backgroundColor: t.statBoxBg, borderRadius: 8, padding: 16 },
    statNum: { fontSize: 26, color: t.accent, fontFamily: "Helvetica-Bold", marginBottom: 4 },
    statLabel: { fontSize: 10, color: t.textMuted, fontFamily: "Helvetica" },
    divider: { height: 1, backgroundColor: t.divider, marginVertical: 20 },
    // Section label
    sectionLabel: { fontSize: 9, color: t.labelColor, fontFamily: "Helvetica-Bold", letterSpacing: 2, marginBottom: 12 },
    sectionTitle: { fontSize: 22, color: t.textPrimary, fontFamily: "Helvetica-Bold", lineHeight: 1.3, marginBottom: 20 },
    // Bullets
    bulletRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
    bulletDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: t.accent, marginTop: 5, marginRight: 10, flexShrink: 0 },
    bulletText: { fontSize: 12, color: t.textMuted, fontFamily: "Helvetica", lineHeight: 1.55, flex: 1 },
    // Stat callouts
    statCallout: { backgroundColor: t.statBoxBg, borderRadius: 6, padding: 10, marginBottom: 8 },
    statCalloutText: { fontSize: 12, color: t.textPrimary, fontFamily: "Helvetica-Bold" },
    // Topic tags row
    topicsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
    topicTag: { backgroundColor: t.badgeBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
    topicTagText: { fontSize: 10, color: t.accent, fontFamily: "Helvetica" },
    // Sentiment badge
    sentimentRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
    sentimentBadge: { backgroundColor: t.accent, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 },
    sentimentText: { fontSize: 10, color: "#FFFFFF", fontFamily: "Helvetica-Bold" },
    // Thread table
    threadRow: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.divider },
    threadTitle: { flex: 1, fontSize: 11, color: t.textMuted, fontFamily: "Helvetica" },
    threadStat: { fontSize: 11, color: t.accent, fontFamily: "Helvetica-Bold", width: 60, textAlign: "right" },
    threadHeader: { flexDirection: "row", paddingBottom: 6, marginBottom: 4 },
    threadHeaderText: { fontSize: 9, color: t.footerColor, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
    // Sources
    sourceRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
    sourcePub: { fontSize: 11, color: t.accent, fontFamily: "Helvetica-Bold", width: 130, flexShrink: 0 },
    sourceDetails: { flex: 1 },
    sourceTitle: { fontSize: 11, color: t.textPrimary, fontFamily: "Helvetica", marginBottom: 2 },
    sourceUrl: { fontSize: 9, color: t.footerColor, fontFamily: "Helvetica" },
    // Harvey angle
    relevanceRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
    relevanceDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: t.accent, marginRight: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    relevanceDotNum: { fontSize: 10, color: "#FFFFFF", fontFamily: "Helvetica-Bold" },
    relevanceText: { fontSize: 12, color: t.textMuted, fontFamily: "Helvetica", lineHeight: 1.55, flex: 1 },
    ctaBox: { backgroundColor: t.accent, borderRadius: 8, padding: 18, marginTop: 24 },
    ctaText: { fontSize: 13, color: "#FFFFFF", fontFamily: "Helvetica-Bold", lineHeight: 1.4 },
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

function CoverPage({ digest, t, date }: { digest: DigestResult; t: ThemeTokens; date: string }) {
  const s = makeStyles(t)
  return (
    <Page size={[PW, PH]} style={s.page}>
      <View style={s.stripe} />
      <View style={s.coverContainer}>
        <Text style={s.coverBrand}>HARVEY AI</Text>
        <Text style={s.coverTitle}>Weekly Market{"\n"}Intelligence</Text>
        <Text style={s.coverSubtitle}>{digest.weekRange}</Text>
        <View style={s.divider} />
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{digest.webCount}</Text>
            <Text style={s.statLabel}>Web Articles Analyzed</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNum}>{digest.redditCount}</Text>
            <Text style={s.statLabel}>Reddit Posts</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNum}>{digest.totalUpvotes.toLocaleString()}</Text>
            <Text style={s.statLabel}>Total Upvotes</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNum}>{digest.totalComments.toLocaleString()}</Text>
            <Text style={s.statLabel}>Total Comments</Text>
          </View>
        </View>
      </View>
      <Footer s={s} page={1} total={5} date={date} />
    </Page>
  )
}

function WebFindingsPage({ digest, t, date }: { digest: DigestResult; t: ThemeTokens; date: string }) {
  const s = makeStyles(t)
  const { webSynthesis } = digest
  return (
    <Page size={[PW, PH]} style={s.page}>
      <View style={s.stripe} />
      <View style={s.body}>
        <Text style={s.sectionLabel}>WEB INTELLIGENCE</Text>
        <Text style={s.sectionTitle}>{webSynthesis.headline}</Text>
        {webSynthesis.keyFindings?.slice(0, 6).map((f, i) => (
          <View key={i} style={s.bulletRow}>
            <View style={s.bulletDot} />
            <Text style={s.bulletText}>{f}</Text>
          </View>
        ))}
        {webSynthesis.notableStats?.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={[s.sectionLabel, { marginBottom: 10 }]}>KEY DATA POINTS</Text>
            {webSynthesis.notableStats.slice(0, 4).map((stat, i) => (
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
      <Footer s={s} page={2} total={5} date={date} />
    </Page>
  )
}

function RedditPulsePage({ digest, t, date }: { digest: DigestResult; t: ThemeTokens; date: string }) {
  const s = makeStyles(t)
  const { redditPulse } = digest
  const sentimentColors: Record<string, string> = {
    positive: "#10B981", negative: "#EF4444", neutral: "#6B7280", mixed: "#F59E0B",
  }
  return (
    <Page size={[PW, PH]} style={s.page}>
      <View style={s.stripe} />
      <View style={s.body}>
        <Text style={s.sectionLabel}>REDDIT COMMUNITY PULSE</Text>
        <Text style={s.sectionTitle}>{redditPulse.headline}</Text>
        <View style={s.sentimentRow}>
          <View style={[s.sentimentBadge, { backgroundColor: sentimentColors[redditPulse.sentiment] ?? t.accent }]}>
            <Text style={s.sentimentText}>Sentiment: {redditPulse.sentiment?.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={[s.sectionLabel, { marginBottom: 10 }]}>COMMUNITY PAIN POINTS</Text>
        {redditPulse.communityPainPoints?.slice(0, 5).map((p, i) => (
          <View key={i} style={s.bulletRow}>
            <View style={s.bulletDot} />
            <Text style={s.bulletText}>{p}</Text>
          </View>
        ))}
        {redditPulse.topDiscussions?.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={[s.sectionLabel, { marginBottom: 8 }]}>TOP DISCUSSIONS</Text>
            <View style={s.threadHeader}>
              <Text style={[s.threadHeaderText, { flex: 1 }]}>THREAD</Text>
              <Text style={[s.threadHeaderText, { width: 60, textAlign: "right" }]}>UPVOTES</Text>
              <Text style={[s.threadHeaderText, { width: 60, textAlign: "right" }]}>COMMENTS</Text>
            </View>
            {redditPulse.topDiscussions.slice(0, 5).map((d, i) => (
              <View key={i} style={s.threadRow}>
                <Text style={s.threadTitle}>{d.title.length > 80 ? d.title.slice(0, 80) + "…" : d.title}</Text>
                <Text style={s.threadStat}>{d.upvotes ?? 0}</Text>
                <Text style={s.threadStat}>{d.comments ?? 0}</Text>
              </View>
            ))}
          </>
        )}
      </View>
      <Footer s={s} page={3} total={5} date={date} />
    </Page>
  )
}

function HarveyAnglePage({ digest, t, date }: { digest: DigestResult; t: ThemeTokens; date: string }) {
  const s = makeStyles(t)
  const { harveyAngle } = digest
  return (
    <Page size={[PW, PH]} style={s.page}>
      <View style={s.stripe} />
      <View style={s.body}>
        <Text style={s.sectionLabel}>HOW HARVEY HELPS</Text>
        <Text style={s.sectionTitle}>{harveyAngle.headline}</Text>
        {harveyAngle.relevancePoints?.map((point, i) => (
          <View key={i} style={s.relevanceRow}>
            <View style={s.relevanceDot}>
              <Text style={s.relevanceDotNum}>{i + 1}</Text>
            </View>
            <Text style={s.relevanceText}>{point}</Text>
          </View>
        ))}
        {harveyAngle.callToAction && (
          <View style={s.ctaBox}>
            <Text style={s.ctaText}>{harveyAngle.callToAction}</Text>
          </View>
        )}
      </View>
      <Footer s={s} page={4} total={5} date={date} />
    </Page>
  )
}

function SourcesPage({ digest, t, date }: { digest: DigestResult; t: ThemeTokens; date: string }) {
  const s = makeStyles(t)
  const sources = digest.webSynthesis.sources ?? []
  return (
    <Page size={[PW, PH]} style={s.page}>
      <View style={s.stripe} />
      <View style={s.body}>
        <Text style={s.sectionLabel}>KEY SOURCES</Text>
        <Text style={s.sectionTitle}>Referenced This Week</Text>
        <View style={s.divider} />
        {sources.slice(0, 12).map((src, i) => (
          <View key={i} style={s.sourceRow}>
            <Text style={s.sourcePub}>{src.publication}</Text>
            <View style={s.sourceDetails}>
              <Text style={s.sourceTitle}>{src.title.length > 100 ? src.title.slice(0, 100) + "…" : src.title}</Text>
              {src.url && <Text style={s.sourceUrl}>{src.url.length > 80 ? src.url.slice(0, 80) + "…" : src.url}</Text>}
            </View>
          </View>
        ))}
        {sources.length === 0 && (
          <Text style={s.bulletText}>No web sources with URLs were available this week.</Text>
        )}
      </View>
      <Footer s={s} page={5} total={5} date={date} />
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
      <WebFindingsPage digest={digest} t={t} date={date} />
      <RedditPulsePage digest={digest} t={t} date={date} />
      <HarveyAnglePage digest={digest} t={t} date={date} />
      <SourcesPage digest={digest} t={t} date={date} />
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
