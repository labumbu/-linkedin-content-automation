import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer, Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"
import { CarouselSlide } from "@/lib/types"

// LinkedIn carousel optimal dimensions: 1080x1080 (square) or 1200x628 (landscape)
// We'll use 1080x1080 pt (points ≈ px at 72dpi)
const W = 540  // half size for file efficiency, renders the same
const H = 540

const BRAND_BG = "#0A0A0F"       // dark near-black (matches Harvey UI)
const ACCENT = "#6366F1"          // indigo accent
const SLIDE_BG = "#13131A"        // slightly lighter card bg
const TEXT_PRIMARY = "#F8F8FF"    // near-white
const TEXT_MUTED = "#8B8BA8"      // muted
const BULLET_DOT = "#6366F1"

const styles = StyleSheet.create({
  page: {
    width: W,
    height: H,
    backgroundColor: BRAND_BG,
    padding: 0,
    fontFamily: "Helvetica",
  },
  // Full-page gradient band (top accent stripe)
  accentStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: ACCENT,
  },
  // Slide number badge
  slideNumBadge: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: SLIDE_BG,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  slideNumText: {
    fontSize: 9,
    color: TEXT_MUTED,
    fontFamily: "Helvetica",
  },
  // Hook slide (slide 1)
  hookContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 48,
    paddingVertical: 48,
  },
  hookLabel: {
    fontSize: 9,
    color: ACCENT,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    marginBottom: 16,
    textTransform: "uppercase",
  },
  hookTitle: {
    fontSize: 32,
    color: TEXT_PRIMARY,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.25,
    marginBottom: 20,
  },
  hookSubline: {
    fontSize: 15,
    color: TEXT_MUTED,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },
  hookDivider: {
    width: 40,
    height: 3,
    backgroundColor: ACCENT,
    marginTop: 28,
  },
  // Content slides (2–6)
  contentContainer: {
    flex: 1,
    paddingHorizontal: 44,
    paddingVertical: 44,
    justifyContent: "center",
  },
  contentTitle: {
    fontSize: 20,
    color: TEXT_PRIMARY,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.3,
    marginBottom: 22,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BULLET_DOT,
    marginTop: 5,
    marginRight: 10,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
    flex: 1,
  },
  // CTA slide (last)
  ctaContainer: {
    flex: 1,
    paddingHorizontal: 48,
    paddingVertical: 48,
    justifyContent: "center",
  },
  ctaLabel: {
    fontSize: 9,
    color: ACCENT,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    marginBottom: 14,
    textTransform: "uppercase",
  },
  ctaTitle: {
    fontSize: 22,
    color: TEXT_PRIMARY,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.35,
    marginBottom: 20,
  },
  ctaQuestion: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontFamily: "Helvetica",
    lineHeight: 1.6,
    marginBottom: 28,
  },
  ctaBox: {
    backgroundColor: ACCENT,
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignSelf: "flex-start",
  },
  ctaBoxText: {
    fontSize: 12,
    color: TEXT_PRIMARY,
    fontFamily: "Helvetica-Bold",
  },
  // Branding footer
  footer: {
    position: "absolute",
    bottom: 18,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerBrand: {
    fontSize: 9,
    color: TEXT_MUTED,
    fontFamily: "Helvetica",
    opacity: 0.5,
  },
  footerAccentDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: ACCENT,
    opacity: 0.5,
  },
})

function parseBullets(body: string): string[] {
  return body
    .split("\n")
    .map(l => l.replace(/^[•\-\*]\s*/, "").trim())
    .filter(Boolean)
}

function HookSlide({ slide, total }: { slide: CarouselSlide; total: number }) {
  const [title, ...subParts] = slide.body ? [slide.title, slide.body] : [slide.title]
  const sub = subParts.join(" ") || slide.body || ""
  return (
    <Page size={[W, H]} style={styles.page}>
      <View style={styles.accentStripe} />
      <View style={styles.slideNumBadge}>
        <Text style={styles.slideNumText}>1 / {total}</Text>
      </View>
      <View style={styles.hookContainer}>
        <Text style={styles.hookLabel}>Harvey Content</Text>
        <Text style={styles.hookTitle}>{slide.title}</Text>
        {sub ? <Text style={styles.hookSubline}>{sub}</Text> : null}
        <View style={styles.hookDivider} />
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerBrand}>harvey.ai</Text>
        <View style={styles.footerAccentDot} />
      </View>
    </Page>
  )
}

function ContentSlide({ slide, index, total }: { slide: CarouselSlide; index: number; total: number }) {
  const bullets = parseBullets(slide.body)
  return (
    <Page size={[W, H]} style={styles.page}>
      <View style={styles.accentStripe} />
      <View style={styles.slideNumBadge}>
        <Text style={styles.slideNumText}>{index + 1} / {total}</Text>
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.contentTitle}>{slide.title}</Text>
        {bullets.map((b, i) => (
          <View key={i} style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>{b}</Text>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerBrand}>harvey.ai</Text>
        <View style={styles.footerAccentDot} />
      </View>
    </Page>
  )
}

function CtaSlide({ slide, index, total }: { slide: CarouselSlide; index: number; total: number }) {
  // Split body into statement + question if possible (question ends with ?)
  const lines = slide.body.split("\n").filter(Boolean)
  const questionLine = lines.find(l => l.includes("?")) || ""
  const statementLines = lines.filter(l => l !== questionLine)
  const statement = statementLines.join(" ") || slide.title
  const question = questionLine || ""

  return (
    <Page size={[W, H]} style={styles.page}>
      <View style={styles.accentStripe} />
      <View style={styles.slideNumBadge}>
        <Text style={styles.slideNumText}>{index + 1} / {total}</Text>
      </View>
      <View style={styles.ctaContainer}>
        <Text style={styles.ctaLabel}>Your turn</Text>
        <Text style={styles.ctaTitle}>{statement}</Text>
        {question ? <Text style={styles.ctaQuestion}>{question}</Text> : null}
        <View style={styles.ctaBox}>
          <Text style={styles.ctaBoxText}>Drop your answer below ↓</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerBrand}>harvey.ai</Text>
        <View style={styles.footerAccentDot} />
      </View>
    </Page>
  )
}

export async function POST(req: NextRequest) {
  const { slides, caption } = await req.json() as { slides: CarouselSlide[]; caption?: string }

  if (!slides || slides.length === 0) {
    return NextResponse.json({ error: "slides are required" }, { status: 400 })
  }

  const total = slides.length

  const doc = (
    <Document title="LinkedIn Carousel" author="Harvey Content Fabric">
      {slides.map((slide, i) => {
        if (i === 0) return <HookSlide key={i} slide={slide} total={total} />
        if (i === total - 1) return <CtaSlide key={i} slide={slide} index={i} total={total} />
        return <ContentSlide key={i} slide={slide} index={i} total={total} />
      })}
    </Document>
  )

  try {
    const buffer = await renderToBuffer(doc)
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="carousel-${Date.now()}.pdf"`,
      },
    })
  } catch (err) {
    console.error("Carousel PDF error:", err)
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 })
  }
}
