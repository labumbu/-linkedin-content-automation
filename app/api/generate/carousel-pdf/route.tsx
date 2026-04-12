import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer, Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"
import { CarouselSlide } from "@/lib/types"

const W = 540
const H = 540

export type PdfTheme = "dark" | "light" | "navy" | "forest"

interface ThemeTokens {
  pageBg: string
  accent: string
  textPrimary: string
  textMuted: string
  badgeBg: string
  ctaBoxBg: string
  stripeHeight: number
  labelColor: string
  footerBrand: string
}

const THEMES: Record<PdfTheme, ThemeTokens> = {
  dark: {
    pageBg: "#0A0A0F",
    accent: "#6366F1",
    textPrimary: "#F8F8FF",
    textMuted: "#8B8BA8",
    badgeBg: "#13131A",
    ctaBoxBg: "#6366F1",
    stripeHeight: 4,
    labelColor: "#6366F1",
    footerBrand: "#8B8BA8",
  },
  light: {
    pageBg: "#FFFFFF",
    accent: "#6366F1",
    textPrimary: "#0F0F1A",
    textMuted: "#6B7280",
    badgeBg: "#F3F4F6",
    ctaBoxBg: "#6366F1",
    stripeHeight: 6,
    labelColor: "#6366F1",
    footerBrand: "#9CA3AF",
  },
  navy: {
    pageBg: "#0D1B2A",
    accent: "#F59E0B",
    textPrimary: "#F0F4F8",
    textMuted: "#8BAAB8",
    badgeBg: "#162434",
    ctaBoxBg: "#F59E0B",
    stripeHeight: 4,
    labelColor: "#F59E0B",
    footerBrand: "#4A7B95",
  },
  forest: {
    pageBg: "#0D1F17",
    accent: "#10B981",
    textPrimary: "#ECFDF5",
    textMuted: "#6EE7B7",
    badgeBg: "#132B1E",
    ctaBoxBg: "#10B981",
    stripeHeight: 4,
    labelColor: "#10B981",
    footerBrand: "#34A068",
  },
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    page: { width: W, height: H, backgroundColor: t.pageBg, padding: 0, fontFamily: "Helvetica" },
    accentStripe: { position: "absolute", top: 0, left: 0, right: 0, height: t.stripeHeight, backgroundColor: t.accent },
    slideNumBadge: { position: "absolute", top: 20, right: 20, backgroundColor: t.badgeBg, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
    slideNumText: { fontSize: 9, color: t.textMuted, fontFamily: "Helvetica" },
    // Hook slide
    hookContainer: { flex: 1, justifyContent: "center", paddingHorizontal: 48, paddingVertical: 48 },
    hookLabel: { fontSize: 9, color: t.labelColor, fontFamily: "Helvetica-Bold", letterSpacing: 2, marginBottom: 16 },
    hookTitle: { fontSize: 30, color: t.textPrimary, fontFamily: "Helvetica-Bold", lineHeight: 1.25, marginBottom: 18 },
    hookSubline: { fontSize: 14, color: t.textMuted, fontFamily: "Helvetica", lineHeight: 1.5 },
    hookDivider: { width: 40, height: 3, backgroundColor: t.accent, marginTop: 24 },
    // Content slides
    contentContainer: { flex: 1, paddingHorizontal: 44, paddingVertical: 44, justifyContent: "center" },
    contentTitle: { fontSize: 19, color: t.textPrimary, fontFamily: "Helvetica-Bold", lineHeight: 1.3, marginBottom: 20 },
    bulletRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 11 },
    bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.accent, marginTop: 5, marginRight: 10, flexShrink: 0 },
    bulletText: { fontSize: 13, color: t.textMuted, fontFamily: "Helvetica", lineHeight: 1.5, flex: 1 },
    // CTA slide
    ctaContainer: { flex: 1, paddingHorizontal: 48, paddingVertical: 48, justifyContent: "center" },
    ctaLabel: { fontSize: 9, color: t.labelColor, fontFamily: "Helvetica-Bold", letterSpacing: 2, marginBottom: 14 },
    ctaTitle: { fontSize: 21, color: t.textPrimary, fontFamily: "Helvetica-Bold", lineHeight: 1.35, marginBottom: 18 },
    ctaQuestion: { fontSize: 13, color: t.textMuted, fontFamily: "Helvetica", lineHeight: 1.6, marginBottom: 26 },
    ctaBox: { backgroundColor: t.ctaBoxBg, borderRadius: 6, paddingHorizontal: 18, paddingVertical: 11, alignSelf: "flex-start" },
    ctaBoxText: { fontSize: 12, color: "#FFFFFF", fontFamily: "Helvetica-Bold" },
    // Footer
    footer: { position: "absolute", bottom: 18, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    footerBrand: { fontSize: 9, color: t.footerBrand, fontFamily: "Helvetica", opacity: 0.6 },
    footerDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: t.accent, opacity: 0.5 },
  })
}

function parseBullets(body: string): string[] {
  return body.split("\n").map(l => l.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean)
}

function HookSlide({ slide, total, t }: { slide: CarouselSlide; total: number; t: ThemeTokens }) {
  const s = makeStyles(t)
  return (
    <Page size={[W, H]} style={s.page}>
      <View style={s.accentStripe} />
      <View style={s.slideNumBadge}><Text style={s.slideNumText}>1 / {total}</Text></View>
      <View style={s.hookContainer}>
        <Text style={s.hookLabel}>HARVEY CONTENT</Text>
        <Text style={s.hookTitle}>{slide.title}</Text>
        {slide.body ? <Text style={s.hookSubline}>{slide.body}</Text> : null}
        <View style={s.hookDivider} />
      </View>
      <View style={s.footer}>
        <Text style={s.footerBrand}>harvey.ai</Text>
        <View style={s.footerDot} />
      </View>
    </Page>
  )
}

function ContentSlide({ slide, index, total, t }: { slide: CarouselSlide; index: number; total: number; t: ThemeTokens }) {
  const s = makeStyles(t)
  const bullets = parseBullets(slide.body)
  return (
    <Page size={[W, H]} style={s.page}>
      <View style={s.accentStripe} />
      <View style={s.slideNumBadge}><Text style={s.slideNumText}>{index + 1} / {total}</Text></View>
      <View style={s.contentContainer}>
        <Text style={s.contentTitle}>{slide.title}</Text>
        {bullets.map((b, i) => (
          <View key={i} style={s.bulletRow}>
            <View style={s.bulletDot} />
            <Text style={s.bulletText}>{b}</Text>
          </View>
        ))}
      </View>
      <View style={s.footer}>
        <Text style={s.footerBrand}>harvey.ai</Text>
        <View style={s.footerDot} />
      </View>
    </Page>
  )
}

function CtaSlide({ slide, index, total, t }: { slide: CarouselSlide; index: number; total: number; t: ThemeTokens }) {
  const s = makeStyles(t)
  const lines = slide.body.split("\n").filter(Boolean)
  const questionLine = lines.find(l => l.includes("?")) || ""
  const statementLines = lines.filter(l => l !== questionLine)
  const statement = statementLines.join(" ") || slide.title
  return (
    <Page size={[W, H]} style={s.page}>
      <View style={s.accentStripe} />
      <View style={s.slideNumBadge}><Text style={s.slideNumText}>{index + 1} / {total}</Text></View>
      <View style={s.ctaContainer}>
        <Text style={s.ctaLabel}>YOUR TURN</Text>
        <Text style={s.ctaTitle}>{statement}</Text>
        {questionLine ? <Text style={s.ctaQuestion}>{questionLine}</Text> : null}
        <View style={s.ctaBox}><Text style={s.ctaBoxText}>Drop your answer below ↓</Text></View>
      </View>
      <View style={s.footer}>
        <Text style={s.footerBrand}>harvey.ai</Text>
        <View style={s.footerDot} />
      </View>
    </Page>
  )
}

export async function POST(req: NextRequest) {
  const { slides, caption, theme = "dark" } = await req.json() as {
    slides: CarouselSlide[]
    caption?: string
    theme?: PdfTheme
  }

  if (!slides || slides.length === 0) {
    return NextResponse.json({ error: "slides are required" }, { status: 400 })
  }

  const t = THEMES[theme] ?? THEMES.dark
  const total = slides.length

  const doc = (
    <Document title="LinkedIn Carousel" author="Harvey Content Fabric">
      {slides.map((slide, i) => {
        if (i === 0) return <HookSlide key={i} slide={slide} total={total} t={t} />
        if (i === total - 1) return <CtaSlide key={i} slide={slide} index={i} total={total} t={t} />
        return <ContentSlide key={i} slide={slide} index={i} total={total} t={t} />
      })}
    </Document>
  )

  try {
    const buffer = await renderToBuffer(doc)
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="carousel-${theme}-${Date.now()}.pdf"`,
      },
    })
  } catch (err) {
    console.error("Carousel PDF error:", err)
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 })
  }
}
