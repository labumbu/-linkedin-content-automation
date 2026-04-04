"use client"

import { useRef, useState } from "react"
import { Search, FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ResearchProgressBar } from "@/components/ResearchProgressBar"
import { ReportViewer } from "@/components/ReportViewer"
import { ReportJSON } from "@/lib/research-types"
import { cn } from "@/lib/utils"

const TEMPLATES = [
  {
    id: "ai-sdr",
    label: "AI SDR Adoption in 2025–2026",
    description: "Market data on AI-powered sales development reps replacing or augmenting human SDRs",
  },
  {
    id: "signal-selling",
    label: "Signal-Based Selling vs. Volume Outbound",
    description: "Evidence on intent signal ROI vs. spray-and-pray outbound strategies",
  },
  {
    id: "pipeline-automation",
    label: "Pipeline Automation & Revenue Leakage",
    description: "Stats on deals lost to manual process gaps, slow follow-up, and fragmented tooling",
  },
  {
    id: "ai-coaching",
    label: "AI Sales Coaching Effectiveness",
    description: "Research on rep performance lift, ramp time reduction, and quota attainment from AI coaching",
  },
  {
    id: "full-loop",
    label: "Full-Loop vs. Point-Solution Sales Stack",
    description: "TCO and conversion data: integrated AI sales platforms vs. fragmented point solutions",
  },
]

type PageState = "select" | "running" | "complete"

export default function ResearchPage() {
  const [pageState, setPageState] = useState<PageState>("select")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [customTopic, setCustomTopic] = useState("")
  const [activeTopic, setActiveTopic] = useState("")
  const [report, setReport] = useState<ReportJSON | null>(null)
  const [researchError, setResearchError] = useState<string | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  const selectedTemplate = TEMPLATES.find(t => t.id === selectedTemplateId)
  const resolvedTopic = selectedTemplateId
    ? (selectedTemplate?.label ?? "")
    : customTopic.trim()

  const canStart = resolvedTopic.length > 0

  const handleStart = () => {
    if (!canStart) return
    setActiveTopic(resolvedTopic)
    setResearchError(null)
    setReport(null)
    setPageState("running")
  }

  const handleComplete = (completedReport: ReportJSON) => {
    setReport(completedReport)
    setPageState("complete")
    setTimeout(() => {
      reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
  }

  const handleError = (msg: string) => {
    setResearchError(msg)
    setPageState("select")
  }

  const handleReset = () => {
    setPageState("select")
    setReport(null)
    setResearchError(null)
    setSelectedTemplateId(null)
    setCustomTopic("")
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold">Research Intelligence</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Generate a 2–5 page evidence-grounded research report with named sources, credibility tiers, and a full bibliography.
          Reports take 1–2 minutes.
        </p>
      </div>

      {/* Topic selection */}
      {pageState === "select" && (
        <div className="space-y-6">
          {researchError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {researchError}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Choose a research template</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TEMPLATES.map(template => (
                <Card
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplateId(template.id === selectedTemplateId ? null : template.id)
                    setCustomTopic("")
                  }}
                  className={cn(
                    "cursor-pointer transition-all hover:border-indigo-500/50",
                    selectedTemplateId === template.id
                      ? "border-indigo-500 ring-1 ring-indigo-500/50"
                      : "border-border"
                  )}
                >
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-sm leading-snug">{template.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <CardDescription className="text-xs leading-snug">
                      {template.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Or enter a custom topic</p>
            <Textarea
              placeholder="e.g. AI impact on enterprise sales cycles in 2025–2026"
              value={customTopic}
              onChange={e => {
                setCustomTopic(e.target.value)
                if (e.target.value.trim()) setSelectedTemplateId(null)
              }}
              className="resize-none text-sm"
              rows={2}
            />
          </div>

          <Button
            onClick={handleStart}
            disabled={!canStart}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Search className="mr-2 h-4 w-4" />
            Research This Topic
          </Button>
        </div>
      )}

      {/* Progress */}
      {pageState === "running" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Researching</CardTitle>
            <CardDescription className="text-sm truncate">{activeTopic}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResearchProgressBar
              topic={activeTopic}
              onComplete={handleComplete}
              onError={handleError}
            />
          </CardContent>
        </Card>
      )}

      {/* Report */}
      {pageState === "complete" && report && (
        <div ref={reportRef} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{report.topic}</h2>
              <p className="text-xs text-muted-foreground">Report complete</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              New Research
            </Button>
          </div>
          <ReportViewer report={report} topic={activeTopic} />
        </div>
      )}
    </div>
  )
}
