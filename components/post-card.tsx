"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Check, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, AlertCircle, Loader2, BarChart2 } from "lucide-react"
import { GeneratedPost } from "@/lib/types"
import { supabase } from "@/lib/supabase/client"

interface PostCardProps {
  post: GeneratedPost
}

interface ScoreResult {
  hookStrength: number
  dwellTime: number
  commentMagnet: number
  algorithmFit: number
  total: number
  hookFeedback: string
  topIssue: string
}

function ScoreBar({ label, value, max = 25 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100)
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-foreground w-8 text-right">{value}/{max}</span>
    </div>
  )
}

export function PostCard({ post }: PostCardProps) {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null)
  const [showHooks, setShowHooks] = useState(false)
  const [copiedHook, setCopiedHook] = useState<number | null>(null)
  const [score, setScore] = useState<ScoreResult | null>(null)
  const [scoring, setScoring] = useState(false)
  const [showScore, setShowScore] = useState(false)

  const handleCopyHook = async (hook: string, idx: number) => {
    await navigator.clipboard.writeText(hook)
    setCopiedHook(idx)
    setTimeout(() => setCopiedHook(null), 2000)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(post.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFeedback = async (value: "up" | "down") => {
    const next = feedback === value ? null : value
    setFeedback(next)

    if (post.dbId) {
      await supabase
        .from("posts")
        .update({ feedback: next })
        .eq("id", post.dbId)
    }
  }

  const handleScore = async () => {
    if (score) {
      setShowScore(!showScore)
      return
    }
    setScoring(true)
    setShowScore(true)
    try {
      const res = await fetch("/api/generate/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: post.content }),
      })
      if (res.ok) {
        const data = await res.json()
        setScore(data)
      }
    } catch {
      // silent fail
    } finally {
      setScoring(false)
    }
  }

  const scoreColor = score
    ? score.total >= 80 ? "text-emerald-400" : score.total >= 60 ? "text-yellow-400" : "text-red-400"
    : "text-muted-foreground"

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
          {post.content}
        </pre>
      </CardContent>
      {/* Hook alternatives */}
      {post.hookAlternatives && post.hookAlternatives.length > 0 && (
        <div className="px-6 pb-3">
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowHooks(!showHooks)}
          >
            {showHooks ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showHooks ? "Hide" : "Show"} 3 alternative hooks
          </button>
          {showHooks && (
            <div className="mt-2 space-y-1.5">
              {post.hookAlternatives.map((hook, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 rounded bg-muted/60 px-3 py-1.5">
                  <span className="text-xs text-foreground flex-1">{hook}</span>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => handleCopyHook(hook, idx)}
                  >
                    {copiedHook === idx ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* CTA note */}
      {post.ctaNote && post.ctaNote !== "CTA strong" && (
        <div className="px-6 pb-3 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-yellow-500/80 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-500/80">{post.ctaNote}</p>
        </div>
      )}
      {/* Score panel */}
      {showScore && (
        <div className="px-6 pb-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            {scoring ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analyzing post quality...
              </div>
            ) : score ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Post Quality Score</span>
                  <span className={`text-lg font-bold tabular-nums ${scoreColor}`}>{score.total}<span className="text-xs text-muted-foreground font-normal">/100</span></span>
                </div>
                <div className="space-y-2">
                  <ScoreBar label="Hook strength" value={score.hookStrength} />
                  <ScoreBar label="Dwell time" value={score.dwellTime} />
                  <ScoreBar label="Comment magnet" value={score.commentMagnet} />
                  <ScoreBar label="Algorithm fit" value={score.algorithmFit} />
                </div>
                {score.hookFeedback && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-2">{score.hookFeedback}</p>
                )}
                {score.topIssue && (
                  <p className="text-xs text-yellow-500/80 flex gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {score.topIssue}
                  </p>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
      <CardFooter className="flex items-center justify-between gap-4 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs text-muted-foreground">
            {post.characterCount} characters
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`${scoreColor} ${score ? "" : "text-muted-foreground"}`}
            onClick={handleScore}
            title="Score this post"
          >
            {scoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={feedback === "up" ? "text-emerald-400" : "text-muted-foreground"}
            onClick={() => handleFeedback("up")}
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={feedback === "down" ? "text-red-400" : "text-muted-foreground"}
            onClick={() => handleFeedback("down")}
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
          <Button onClick={handleCopy} size="sm" variant="outline">
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy to LinkedIn
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
