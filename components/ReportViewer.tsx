"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Download, PenLine, Info, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ReportJSON, HeadlineStat } from "@/lib/research-types"
import { Trend } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Props {
  report: ReportJSON
  topic: string
}

function getSourceQuality(tier1: number, tier2: number) {
  if (tier1 >= 2) {
    return {
      color: "green",
      label: "High Evidence Quality",
      description: "Tier 1 analyst research included",
      shareRec: "Safe to send to prospects.",
      shareColor: "text-emerald-400",
    }
  }
  if (tier2 >= 3) {
    return {
      color: "amber",
      label: "Moderate Evidence Quality",
      description: "Tier 2 vendor research",
      shareRec: "Review citations before sharing — vendor research may have commercial bias.",
      shareColor: "text-yellow-400",
    }
  }
  return {
    color: "red",
    label: "Limited Evidence Quality",
    description: "Limited credible sources found",
    shareRec: "Not recommended for external sharing — limited credible sources found for this topic.",
    shareColor: "text-red-400",
  }
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-lg border border-border">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors rounded-lg"
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

function TierDots({ tier }: { tier: 1 | 2 | null }) {
  if (tier === 1) return <span className="text-indigo-400 text-xs">●●●</span>
  if (tier === 2) return <span className="text-indigo-300 text-xs">●●</span>
  return <span className="text-muted-foreground text-xs">●</span>
}

export function ReportViewer({ report, topic }: Props) {
  const router = useRouter()
  const [isDownloading, setIsDownloading] = useState(false)

  const sp = report.sources_page
  const quality = getSourceQuality(sp.tier1_count, sp.tier2_count)
  const isLimitedEvidence = report.evidence_density.recommended_pages === 2

  const handleDownloadPdf = async () => {
    setIsDownloading(true)
    try {
      const res = await fetch("/api/research/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      })
      if (!res.ok) throw new Error("PDF generation failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `harvey-research-${topic.slice(0, 40).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("PDF download error:", err)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleGeneratePosts = () => {
    const syntheticTrend: Trend = {
      id: `research-${Date.now()}`,
      title: report.topic,
      summary: report.executive_summary.one_paragraph_summary,
      source: "Web Search",
      relevanceScore: 9,
      velocity: "hot",
      source_url: undefined,
    }
    sessionStorage.setItem("selectedTrend", JSON.stringify(syntheticTrend))
    router.push(`/generate?trendId=${syntheticTrend.id}`)
  }

  return (
    <div className="space-y-6">
      {/* Source quality + actions bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              {/* Quality badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-medium",
                    quality.color === "green" && "border-emerald-500/30 text-emerald-400",
                    quality.color === "amber" && "border-yellow-500/30 text-yellow-400",
                    quality.color === "red" && "border-red-500/30 text-red-400"
                  )}
                >
                  {quality.label}
                </Badge>
                <span className="text-xs text-muted-foreground">— {quality.description}</span>
              </div>

              {/* Source breakdown */}
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{sp.total_sources} sources</span>
                {sp.tier1_count > 0 && ` · ${sp.tier1_count} Tier 1 (analyst)`}
                {sp.tier2_count > 0 && ` · ${sp.tier2_count} Tier 2 (vendor research)`}
                {sp.tier3_count > 0 && ` · ${sp.tier3_count} Tier 3 (trade press)`}
              </p>

              {/* Headline stat quality */}
              <p className="text-xs text-muted-foreground">
                {report.executive_summary.headline_stats.length} headline {report.executive_summary.headline_stats.length === 1 ? "statistic" : "statistics"} — all from Tier 1 or Tier 2 sources
              </p>

              {/* Share recommendation */}
              <p className={cn("text-xs", quality.shareColor)}>{quality.shareRec}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {isDownloading ? "Generating PDF…" : "Download PDF"}
              </Button>
              <Button size="sm" onClick={handleGeneratePosts}>
                <PenLine className="mr-1.5 h-3.5 w-3.5" />
                Generate LinkedIn Posts
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limited evidence warning */}
      {isLimitedEvidence && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Limited Tier 1 evidence found for this topic. This report contains only an executive summary.
            Consider broadening your search query for more depth.
          </span>
        </div>
      )}

      {/* Report page count badge */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground">
          {report.evidence_density.recommended_pages}-page report
        </span>
        <span>·</span>
        <span>{report.evidence_density.total_data_points} cited data points extracted</span>
      </div>

      {/* Executive summary — headline stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Executive Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {report.executive_summary.one_paragraph_summary}
          </p>

          {report.executive_summary.headline_stats.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {report.executive_summary.headline_stats.map((stat: HeadlineStat, i: number) => (
                <div
                  key={i}
                  className="rounded-md border border-border bg-muted/40 p-3 space-y-1"
                >
                  <p className="text-2xl font-bold text-indigo-400">{stat.stat}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{stat.context}</p>
                  <div className="flex items-center gap-1.5">
                    <TierDots tier={stat.source_tier} />
                    <span className="text-xs text-muted-foreground">{stat.source_name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-3 py-2">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide mb-1">Key Takeaway</p>
            <p className="text-sm text-foreground">{report.executive_summary.key_takeaway}</p>
          </div>
        </CardContent>
      </Card>

      {/* Optional sections — collapsible cards */}
      {(report.comparison_section || report.evidence_section || report.gap_section || report.conclusion) && (
        <div className="space-y-2">
          {report.comparison_section && (report.comparison_section.comparison_rows?.length ?? 0) > 0 && (
            <CollapsibleSection title={report.comparison_section.title}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">Dimension</th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">Current</th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">Emerging</th>
                      <th className="pb-2 font-medium text-muted-foreground">Implication</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.comparison_section.comparison_rows.map((row, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 font-medium">{row.dimension}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{row.current_state}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{row.emerging_state}</td>
                        <td className="py-2 text-muted-foreground">{row.implication}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}

          {report.evidence_section && (report.evidence_section.studies?.length ?? 0) > 0 && (
            <CollapsibleSection title={report.evidence_section.title}>
              <div className="space-y-3">
                {report.evidence_section.studies.map((study, i) => (
                  <div key={i} className="border-l-2 border-indigo-500/30 pl-3 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <TierDots tier={study.source_tier as 1 | 2 | null} />
                      <span className="text-xs font-medium text-indigo-400">{study.citation}</span>
                    </div>
                    <p className="text-sm">{study.finding}</p>
                    {study.sample_size && (
                      <p className="text-xs text-muted-foreground">Sample: {study.sample_size}</p>
                    )}
                  </div>
                ))}
                <p className="text-sm text-muted-foreground pt-2 border-t border-border/50">
                  {report.evidence_section.synthesis_paragraph}
                </p>
              </div>
            </CollapsibleSection>
          )}

          {report.gap_section && (report.gap_section.gaps?.length ?? 0) >= 3 && (
            <CollapsibleSection title={report.gap_section.title}>
              <div className="space-y-4">
                {report.gap_section.gaps.map((gap, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-sm font-medium">{i + 1}. {gap.gap}</p>
                    <p className="text-xs text-muted-foreground">{gap.why_it_matters}</p>
                    <p className="text-xs text-indigo-400 italic">{gap.harvey_angle}</p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {report.conclusion && (
            <CollapsibleSection title={report.conclusion.title}>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{report.conclusion.strategic_summary}</p>
                <div className="space-y-1">
                  {report.conclusion.recommendations.map((rec, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className="font-medium text-indigo-400 shrink-0">{i + 1}.</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-md bg-indigo-600 px-3 py-2">
                  <p className="text-sm text-white">{report.conclusion.harvey_cta}</p>
                </div>
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}

      {/* Sources summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            Sources & Methodology
            <span className="text-xs font-normal text-muted-foreground">({sp.total_sources} cited)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground italic mb-3">{sp.methodology_note}</p>
          <div className="space-y-2">
            {sp.sources.slice(0, 8).map((source, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className={cn(
                  "shrink-0 mt-0.5",
                  source.tier === 1 && "text-indigo-400",
                  source.tier === 2 && "text-indigo-300",
                  source.tier === 3 && "text-muted-foreground"
                )}>
                  {source.tier === 1 ? "●●●" : source.tier === 2 ? "●●" : "●"}
                </span>
                <div>
                  <span className="font-medium">{source.author_or_org}</span>
                  <span className="text-muted-foreground"> · {source.title}</span>
                  {source.year && <span className="text-muted-foreground"> ({source.year})</span>}
                </div>
              </div>
            ))}
            {sp.sources.length > 8 && (
              <p className="text-xs text-muted-foreground pl-4">
                + {sp.sources.length - 8} more — see full Sources page in PDF
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom action bar */}
      <div className="flex gap-3 pt-2 border-t border-border">
        <Button
          variant="outline"
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          className="flex-1 sm:flex-none"
        >
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? "Generating PDF…" : "Download PDF"}
        </Button>
        <Button onClick={handleGeneratePosts} className="flex-1 sm:flex-none">
          <PenLine className="mr-2 h-4 w-4" />
          Generate LinkedIn Posts
        </Button>
      </div>
    </div>
  )
}
