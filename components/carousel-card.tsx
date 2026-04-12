"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Check, ChevronLeft, ChevronRight, Layers, Download, Loader2 } from "lucide-react"
import { GeneratedPost } from "@/lib/types"

interface CarouselCardProps {
  post: GeneratedPost
}

type PdfTheme = "dark" | "light" | "navy" | "forest"

const THEMES: { id: PdfTheme; label: string; bg: string; accent: string; text: string }[] = [
  { id: "dark",   label: "Dark",   bg: "#0A0A0F", accent: "#6366F1", text: "#F8F8FF" },
  { id: "light",  label: "Light",  bg: "#FFFFFF", accent: "#6366F1", text: "#0F0F1A" },
  { id: "navy",   label: "Navy",   bg: "#0D1B2A", accent: "#F59E0B", text: "#F0F4F8" },
  { id: "forest", label: "Forest", bg: "#0D1F17", accent: "#10B981", text: "#ECFDF5" },
]

export function CarouselCard({ post }: CarouselCardProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [copiedSlide, setCopiedSlide] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<PdfTheme>("dark")

  const slides = post.slides ?? []
  const slide = slides[currentSlide]

  const handleCopyCaption = async () => {
    await navigator.clipboard.writeText(post.content)
    setCopiedCaption(true)
    setTimeout(() => setCopiedCaption(false), 2000)
  }

  const handleCopySlide = async () => {
    if (!slide) return
    const text = `${slide.title}\n\n${slide.body}`
    await navigator.clipboard.writeText(text)
    setCopiedSlide(true)
    setTimeout(() => setCopiedSlide(false), 2000)
  }

  const handleDownloadPdf = async () => {
    if (!slides.length) return
    setDownloadingPdf(true)
    try {
      const res = await fetch("/api/generate/carousel-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides, caption: post.content, theme: selectedTheme }),
      })
      if (!res.ok) throw new Error("PDF generation failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `carousel-${selectedTheme}-${post.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silent
    } finally {
      setDownloadingPdf(false)
    }
  }

  const slideLabel = (n: number) => {
    if (n === 0) return "Hook"
    if (n === slides.length - 1) return "CTA"
    return `Slide ${n + 1}`
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6 space-y-4">
        {/* Slide header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {slideLabel(currentSlide)} · {currentSlide + 1}/{slides.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentSlide ? "w-4 bg-foreground" : "w-1.5 bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Slide content */}
        {slide && (
          <div className="rounded-lg border border-border bg-muted/30 p-5 min-h-[140px]">
            <p className="font-semibold text-foreground text-base leading-tight mb-3">{slide.title}</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{slide.body}</p>
          </div>
        )}

        {/* Nav */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
            disabled={currentSlide === 0}
            className="text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Prev
          </Button>
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleCopySlide}
          >
            {copiedSlide ? (
              <span className="flex items-center gap-1 text-emerald-400"><Check className="h-3 w-3" />Copied</span>
            ) : (
              <span className="flex items-center gap-1"><Copy className="h-3 w-3" />Copy slide</span>
            )}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
            disabled={currentSlide === slides.length - 1}
            className="text-muted-foreground"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Companion caption */}
        {post.content && (
          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">LinkedIn caption</p>
            <p className="text-sm text-foreground">{post.content}</p>
          </div>
        )}

        {/* PDF Theme picker */}
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">PDF Design</p>
          <div className="flex gap-2">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme.id)}
                title={theme.label}
                className={`relative flex flex-col items-center gap-1.5 rounded-lg p-1.5 transition-all ${
                  selectedTheme === theme.id
                    ? "ring-2 ring-offset-2 ring-offset-card ring-foreground"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                {/* Mini slide preview */}
                <div
                  className="w-14 h-14 rounded-md flex flex-col overflow-hidden"
                  style={{ backgroundColor: theme.bg }}
                >
                  {/* Accent stripe */}
                  <div style={{ height: 3, backgroundColor: theme.accent, flexShrink: 0 }} />
                  <div className="flex-1 flex flex-col justify-center px-2 gap-1">
                    {/* Title line */}
                    <div style={{ height: 3, borderRadius: 2, backgroundColor: theme.text, opacity: 0.9, width: "75%" }} />
                    {/* Sub lines */}
                    <div style={{ height: 2, borderRadius: 2, backgroundColor: theme.text, opacity: 0.4, width: "60%" }} />
                    <div style={{ height: 2, borderRadius: 2, backgroundColor: theme.text, opacity: 0.4, width: "45%" }} />
                    {/* Accent divider */}
                    <div style={{ height: 2, borderRadius: 1, backgroundColor: theme.accent, width: "25%", marginTop: 2 }} />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{theme.label}</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-4 border-t border-border pt-4">
        <Badge variant="outline" className="text-xs text-muted-foreground">
          {slides.length} slides
        </Badge>
        <div className="flex items-center gap-2">
          <Button onClick={handleCopyCaption} size="sm" variant="outline">
            {copiedCaption ? (
              <><Check className="mr-2 h-4 w-4 text-emerald-400" />Copied</>
            ) : (
              <><Copy className="mr-2 h-4 w-4" />Copy caption</>
            )}
          </Button>
          <Button onClick={handleDownloadPdf} size="sm" variant="default" disabled={downloadingPdf}>
            {downloadingPdf ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
            ) : (
              <><Download className="mr-2 h-4 w-4" />Download PDF</>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
