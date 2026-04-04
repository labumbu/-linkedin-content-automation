"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Loader2, Circle } from "lucide-react"
import { EvidenceDensity, ReportJSON, ResearchSSEEvent } from "@/lib/research-types"
import { cn } from "@/lib/utils"

const STAGE_LABELS: Record<number, string> = {
  1: "Generating search queries",
  2: "Searching the web",
  3: "Ranking sources by credibility",
  4: "Extracting data points",
  5: "Synthesising report",
}

interface Props {
  topic: string
  onComplete: (report: ReportJSON) => void
  onError?: (message: string) => void
}

export function ResearchProgressBar({ topic, onComplete, onError }: Props) {
  const [completedStages, setCompletedStages] = useState<Set<number>>(new Set())
  const [activeStage, setActiveStage] = useState<number>(1)
  const [stageMessages, setStageMessages] = useState<Record<number, string>>({})
  const [evidenceMsg, setEvidenceMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    // Guard against double-fire in React 19 strict mode
    if (startedRef.current) return
    startedRef.current = true

    const controller = new AbortController()

    async function run() {
      try {
        const res = await fetch("/api/research/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic }),
          signal: controller.signal,
        })

        if (!res.ok || !res.body) {
          throw new Error(`Request failed: ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue
            try {
              const event: ResearchSSEEvent = JSON.parse(trimmed)
              handleEvent(event)
            } catch {
              // skip malformed lines
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        const msg = err instanceof Error ? err.message : "Research pipeline failed"
        setError(msg)
        onError?.(msg)
      }
    }

    function handleEvent(event: ResearchSSEEvent) {
      switch (event.type) {
        case "stage_complete":
          setCompletedStages(prev => new Set([...prev, event.stage]))
          setActiveStage(event.stage + 1)
          setStageMessages(prev => ({ ...prev, [event.stage]: event.message }))
          break
        case "evidence_assessed": {
          const ed: EvidenceDensity = event.evidence_density
          const tier1 = ed.tier_sources.find(s => s.tier === 1)?.count ?? 0
          const tier2 = ed.tier_sources.find(s => s.tier === 2)?.count ?? 0
          const totalTier12 = tier1 + tier2
          setEvidenceMsg(
            `Assessed evidence: ${totalTier12} credible source${totalTier12 !== 1 ? "s" : ""} found ` +
            `(${tier1} Tier 1, ${tier2} Tier 2) — generating ${ed.recommended_pages}-page report`
          )
          break
        }
        case "synthesis_complete":
          onComplete(event.report)
          break
        case "error":
          setError(event.message)
          onError?.(event.message)
          break
      }
    }

    run()

    return () => {
      controller.abort()
    }
  }, [topic, onComplete, onError])

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Research failed: {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {Object.entries(STAGE_LABELS).map(([stageStr, label]) => {
          const stage = Number(stageStr)
          const isDone = completedStages.has(stage)
          const isActive = activeStage === stage && !isDone
          const isPending = !isDone && !isActive

          return (
            <div key={stage} className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex-1">
                <span className={cn(
                  "text-sm",
                  isDone && "text-foreground",
                  isActive && "font-medium text-foreground",
                  isPending && "text-muted-foreground/50"
                )}>
                  {label}
                </span>
                {isDone && stageMessages[stage] && (
                  <p className="text-xs text-muted-foreground mt-0.5">{stageMessages[stage]}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {evidenceMsg && (
        <div className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-300">
          {evidenceMsg}
        </div>
      )}
    </div>
  )
}
