"use client"

import { useRef, useState } from "react"
import { Link, FileText, PenLine, Copy, Check, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tone } from "@/lib/types"
import { toast } from "@/hooks/use-toast"

const tones: Tone[] = ["Direct & Bold", "Data-Driven", "Contrarian", "Storytelling", "HOW TO", "WHAT TO"]

const humanityLabels: Record<number, string> = {
  1: "Polished & structured",
  2: "Professional with warmth",
  3: "Balanced",
  4: "Conversational & personal",
  5: "Raw & human",
}

interface SummaryResult {
  title: string
  summary: string
  bullets: string[]
  stats: string[]
  sentiment: string
  source_url: string
}

export default function ResearchPage() {
  // --- Shared tab state ---
  const [activeTab, setActiveTab] = useState("summarize")

  // --- Summarize tab state ---
  const [summarizeMode, setSummarizeMode] = useState<"url" | "pdf">("url")
  const [summarizeUrl, setSummarizeUrl] = useState("")
  const [summarizing, setSummarizing] = useState(false)
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  // --- Write Post tab state ---
  const [postTopic, setPostTopic] = useState("")
  const [postTone, setPostTone] = useState<Tone>("Direct & Bold")
  const [postSize, setPostSize] = useState<"Short" | "Medium" | "Long">("Medium")
  const [postExperience, setPostExperience] = useState("")
  const [postContext, setPostContext] = useState("")
  const [postHumanity, setPostHumanity] = useState([3])
  const [includeHarvey, setIncludeHarvey] = useState(false)
  const [generatingPost, setGeneratingPost] = useState(false)
  const [generatedPost, setGeneratedPost] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // --- Summarize handlers ---
  const handleSummarizeUrl = async () => {
    if (!summarizeUrl.trim()) return
    setSummarizing(true)
    setSummaryResult(null)
    try {
      const res = await fetch("/api/research/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: summarizeUrl.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSummaryResult(await res.json())
    } catch (err: any) {
      toast({ title: "Failed to summarize", description: err.message, variant: "destructive" })
    } finally {
      setSummarizing(false)
    }
  }

  const handleSummarizePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSummarizing(true)
    setSummaryResult(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/research/summarize", { method: "POST", body: formData })
      if (!res.ok) throw new Error((await res.json()).error)
      setSummaryResult(await res.json())
    } catch (err: any) {
      toast({ title: "Failed to summarize PDF", description: err.message, variant: "destructive" })
    } finally {
      setSummarizing(false)
      if (pdfInputRef.current) pdfInputRef.current.value = ""
    }
  }

  const prefillFromSummary = (result: SummaryResult) => {
    const parts: string[] = []
    if (result.bullets.length > 0) {
      parts.push(result.bullets.map(b => `• ${b}`).join("\n"))
    }
    if (result.stats.length > 0) {
      parts.push("Key data points:\n" + result.stats.map(s => `• ${s}`).join("\n"))
    }
    if (result.summary) {
      parts.push(`Summary:\n${result.summary}`)
    }
    setPostExperience(parts.join("\n\n"))
    setPostTopic(result.title || "")
    setPostContext(result.source_url?.startsWith("http") ? `Source: ${result.source_url}` : "")
    setGeneratedPost(null)
    setActiveTab("post")
  }

  // --- Write Post handlers ---
  const handleGeneratePost = async () => {
    if (!postTopic.trim() || !postExperience.trim()) return
    setGeneratingPost(true)
    setGeneratedPost(null)
    try {
      const res = await fetch("/api/research/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: postTopic.trim(),
          tone: postTone,
          experience: postExperience.trim(),
          context: postContext.trim(),
          humanityLevel: postHumanity[0],
          postSize,
          includeHarvey,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      setGeneratedPost(data.content)
    } catch (err: any) {
      toast({ title: "Failed to generate post", description: err.message, variant: "destructive" })
    } finally {
      setGeneratingPost(false)
    }
  }

  const handleCopy = () => {
    if (!generatedPost) return
    navigator.clipboard.writeText(generatedPost)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Research</h1>
        <p className="text-muted-foreground mt-1">Summarize articles & PDFs, or write data-driven posts from research insights.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="summarize">Summarize</TabsTrigger>
          <TabsTrigger value="post">Write Post</TabsTrigger>
        </TabsList>

        {/* ── Summarize Tab ── */}
        <TabsContent value="summarize" className="mt-6 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Summarize Article or PDF</CardTitle>
              <CardDescription>Paste a URL or upload a PDF — get a structured summary with key takeaways and data points.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={summarizeMode} onValueChange={(v) => setSummarizeMode(v as "url" | "pdf")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url"><Link className="mr-2 h-3 w-3" />URL</TabsTrigger>
                  <TabsTrigger value="pdf"><FileText className="mr-2 h-3 w-3" />PDF</TabsTrigger>
                </TabsList>
              </Tabs>

              {summarizeMode === "url" ? (
                <div className="flex gap-2">
                  <Input
                    value={summarizeUrl}
                    onChange={(e) => setSummarizeUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSummarizeUrl()}
                    placeholder="https://techcrunch.com/..."
                  />
                  <Button onClick={handleSummarizeUrl} disabled={!summarizeUrl.trim() || summarizing}>
                    {summarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Summarize"}
                  </Button>
                </div>
              ) : (
                <div>
                  <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={handleSummarizePdf} />
                  <Button variant="outline" onClick={() => pdfInputRef.current?.click()} disabled={summarizing}>
                    {summarizing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Summarizing...</> : <><FileText className="mr-2 h-4 w-4" />Choose PDF</>}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {summarizing && !summaryResult && (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Summarizing...</span>
            </div>
          )}

          {summaryResult && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">{summaryResult.title}</CardTitle>
                {summaryResult.source_url && summaryResult.source_url.startsWith("http") && (
                  <CardDescription>
                    <a href={summaryResult.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground truncate block">
                      {summaryResult.source_url}
                    </a>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{summaryResult.summary}</p>
                {summaryResult.bullets.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Key Takeaways</p>
                    <ul className="space-y-1">
                      {summaryResult.bullets.map((b, i) => (
                        <li key={i} className="text-sm flex gap-2"><span className="text-muted-foreground shrink-0">·</span>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {summaryResult.stats.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notable Data Points</p>
                    <ul className="space-y-1">
                      {summaryResult.stats.map((s, i) => (
                        <li key={i} className="text-sm flex gap-2"><span className="text-indigo-400 shrink-0">→</span>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="pt-2 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => prefillFromSummary(summaryResult)}>
                    <ArrowRight className="mr-2 h-3 w-3" />
                    Write Post from this
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Write Post Tab ── */}
        <TabsContent value="post" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Post Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Topic</Label>
                  <Input value={postTopic} onChange={(e) => setPostTopic(e.target.value)} placeholder="e.g. Why cold email still works in 2026" />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Tone</Label>
                  <Select value={postTone} onValueChange={(v) => setPostTone(v as Tone)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {tones.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Post Size</Label>
                  <Tabs value={postSize} onValueChange={(v) => setPostSize(v as "Short" | "Medium" | "Long")}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="Short">Short</TabsTrigger>
                      <TabsTrigger value="Medium">Medium</TabsTrigger>
                      <TabsTrigger value="Long">Long</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <p className="text-xs text-muted-foreground">
                    {postSize === "Short" && "400–600 characters · punchy & concise"}
                    {postSize === "Medium" && "700–1000 characters · balanced depth"}
                    {postSize === "Long" && "1200–1800 characters · full analysis & data"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Research insights & data points <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    value={postExperience}
                    onChange={(e) => setPostExperience(e.target.value)}
                    placeholder="Paste key statistics, findings, data points, or research notes here. The more specific the numbers, the stronger the post."
                    className="resize-none text-sm min-h-[140px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Additional context <span className="text-xs">(optional)</span></Label>
                  <Textarea
                    value={postContext}
                    onChange={(e) => setPostContext(e.target.value)}
                    placeholder="Source URL, extra context, angle to emphasize..."
                    className="resize-none text-sm min-h-[60px]"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Humanity Level</Label>
                    <span className="text-xs text-muted-foreground">{humanityLabels[postHumanity[0]]}</span>
                  </div>
                  <Slider value={postHumanity} onValueChange={setPostHumanity} min={1} max={5} step={1} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Polished</span><span>Human</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="harvey" checked={includeHarvey} onCheckedChange={setIncludeHarvey} />
                  <Label htmlFor="harvey" className="text-sm text-muted-foreground cursor-pointer">
                    Include Harvey angle
                  </Label>
                </div>

                <Button
                  onClick={handleGeneratePost}
                  disabled={generatingPost || !postTopic.trim() || !postExperience.trim()}
                  className="w-full"
                  size="lg"
                >
                  {generatingPost ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Writing...</> : <><PenLine className="mr-2 h-4 w-4" />Write Post</>}
                </Button>
              </CardContent>
            </Card>

            <div>
              {generatingPost && !generatedPost && (
                <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Writing your post...</span>
                </div>
              )}
              {generatedPost && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Generated Post</CardTitle>
                      <Button variant="outline" size="sm" onClick={handleCopy}>
                        {copied ? <><Check className="mr-2 h-3 w-3" />Copied</> : <><Copy className="mr-2 h-3 w-3" />Copy</>}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">{generatedPost}</pre>
                  </CardContent>
                </Card>
              )}
              {!generatingPost && !generatedPost && (
                <div className="flex items-center justify-center h-full min-h-[200px] border border-dashed border-border rounded-lg text-muted-foreground">
                  <div className="text-center space-y-2">
                    <PenLine className="h-8 w-8 mx-auto opacity-30" />
                    <p className="text-sm">Fill in your research notes and click Write Post</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
