"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Check, ChevronLeft, ChevronRight, Layers } from "lucide-react"
import { GeneratedPost } from "@/lib/types"

interface CarouselCardProps {
  post: GeneratedPost
}

export function CarouselCard({ post }: CarouselCardProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [copiedSlide, setCopiedSlide] = useState(false)

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
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-4 border-t border-border pt-4">
        <Badge variant="outline" className="text-xs text-muted-foreground">
          {slides.length} slides
        </Badge>
        <Button onClick={handleCopyCaption} size="sm" variant="outline">
          {copiedCaption ? (
            <>
              <Check className="mr-2 h-4 w-4 text-emerald-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy caption
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
