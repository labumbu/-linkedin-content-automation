"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Copy, Check, Save, RefreshCw, Star, Trash2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Trend } from "@/lib/types"

interface SavedComment {
  id: string
  platform: "reddit" | "linkedin"
  archetype: string
  original_content: string
  generated_comment: string
  word_count: number
  trend_title: string | null
  created_at: string
}

const REDDIT_ARCHETYPES = ["Auto (AI picks)", "Detailed Helper", "Tool Roundup", "Storyteller", "Myth Buster", "Mini-Guide"]
const LINKEDIN_ARCHETYPES = ["Auto (AI picks)", "Add a Layer", "The Bridge", "The Question", "The Data Drop", "Warm Congrats", "The Contrarian"]

interface RedditResult {
  comment: string
  archetype: string
  wordCount: number
  recommendedArchetype?: string
}

interface LinkedInVariant {
  archetype: string
  body: string
  wordCount: number
  recommended: boolean
}

interface LinkedInResult {
  variants: LinkedInVariant[]
  recommendedArchetype?: string
}

function CommentsContent() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") === "linkedin" ? "linkedin" : "reddit"
  const trendId = searchParams.get("trendId")

  // Reddit state
  const [trendTitle, setTrendTitle] = useState("")
  const [trendSummary, setTrendSummary] = useState("")
  const [trendUrl, setTrendUrl] = useState("")
  const [redditArchetype, setRedditArchetype] = useState("Auto (AI picks)")
  const [generatingReddit, setGeneratingReddit] = useState(false)
  const [redditResult, setRedditResult] = useState<RedditResult | null>(null)
  const [copiedReddit, setCopiedReddit] = useState(false)

  // LinkedIn state
  const [postContent, setPostContent] = useState("")
  const [linkedinArchetype, setLinkedinArchetype] = useState("Auto (AI picks)")
  const [generatingLinkedin, setGeneratingLinkedin] = useState(false)
  const [linkedinResult, setLinkedinResult] = useState<LinkedInResult | null>(null)
  const [copiedLinkedin, setCopiedLinkedin] = useState<number | null>(null)

  // History state
  const [historyComments, setHistoryComments] = useState<SavedComment[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [copiedHistory, setCopiedHistory] = useState<string | null>(null)

  const loadHistory = async () => {
    if (historyLoading) return
    setHistoryLoading(true)
    try {
      const res = await fetch("/api/comments")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setHistoryComments(data.comments ?? [])
      setHistoryLoaded(true)
    } catch {
      toast({ title: "Failed to load history", variant: "destructive" })
    } finally {
      setHistoryLoading(false)
    }
  }

  const deleteComment = async (id: string) => {
    setHistoryComments((prev) => prev.filter((c) => c.id !== id))
  }

  // Pre-fill from sessionStorage if redirected from trend card
  useEffect(() => {
    if (!trendId) return
    const stored = sessionStorage.getItem("selectedTrend")
    if (stored) {
      const trend: Trend = JSON.parse(stored)
      if (trend.id === trendId) {
        setTrendTitle(trend.title)
        setTrendSummary(trend.summary)
        setTrendUrl(trend.source_url ?? "")
      }
    }
  }, [trendId])

  const generateRedditComment = async (save = false) => {
    if (!trendTitle.trim()) return
    setGeneratingReddit(true)
    setRedditResult(null)
    try {
      const res = await fetch("/api/comments/reddit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trendTitle,
          trendSummary,
          trendUrl,
          archetype: redditArchetype === "Auto (AI picks)" ? "auto" : redditArchetype,
          save,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRedditResult(data)
      if (save) toast({ title: "Comment saved" })
    } catch {
      toast({ title: "Generation failed", variant: "destructive" })
    } finally {
      setGeneratingReddit(false)
    }
  }

  const generateLinkedinComments = async (save = false) => {
    if (!postContent.trim()) return
    setGeneratingLinkedin(true)
    setLinkedinResult(null)
    try {
      const res = await fetch("/api/comments/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postContent,
          archetype: linkedinArchetype === "Auto (AI picks)" ? "auto" : linkedinArchetype,
          save,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLinkedinResult(data)
      if (save) toast({ title: "Comments saved" })
    } catch {
      toast({ title: "Generation failed", variant: "destructive" })
    } finally {
      setGeneratingLinkedin(false)
    }
  }

  const copyReddit = () => {
    if (!redditResult) return
    navigator.clipboard.writeText(redditResult.comment)
    setCopiedReddit(true)
    setTimeout(() => setCopiedReddit(false), 2000)
  }

  const copyLinkedin = (idx: number, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedLinkedin(idx)
    setTimeout(() => setCopiedLinkedin(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Comment Generator</h1>
        <p className="text-muted-foreground mt-1">Generate engaging comments for Reddit threads and LinkedIn posts</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-sm">
          <TabsTrigger value="reddit">Reddit</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
          <TabsTrigger value="history" onClick={() => !historyLoaded && loadHistory()}>History</TabsTrigger>
        </TabsList>

        {/* Reddit Tab */}
        <TabsContent value="reddit" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
            {/* Left: inputs */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Thread Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Thread Title <span className="text-destructive">*</span></Label>
                  <Input
                    value={trendTitle}
                    onChange={(e) => setTrendTitle(e.target.value)}
                    placeholder="What is the thread about?"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Thread Summary / Context</Label>
                  <Textarea
                    value={trendSummary}
                    onChange={(e) => setTrendSummary(e.target.value)}
                    placeholder="Key points from the thread..."
                    className="resize-none min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Thread URL</Label>
                  <Input
                    value={trendUrl}
                    onChange={(e) => setTrendUrl(e.target.value)}
                    placeholder="https://reddit.com/r/..."
                  />
                  {trendId && !trendUrl && (
                    <p className="text-xs text-muted-foreground">URL not available for this trend — paste it manually.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Archetype</Label>
                  <Select value={redditArchetype} onValueChange={setRedditArchetype}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REDDIT_ARCHETYPES.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {redditArchetype === "Auto (AI picks)" && (
                    <p className="text-xs text-muted-foreground">AI will pick the best archetype and highlight it</p>
                  )}
                </div>
                <Button
                  onClick={() => generateRedditComment(false)}
                  disabled={generatingReddit || !trendTitle.trim()}
                  className="w-full"
                >
                  {generatingReddit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : "Generate Comment"}
                </Button>
              </CardContent>
            </Card>

            {/* Right: output */}
            <div className="space-y-4">
              {generatingReddit && !redditResult && (
                <Card className="bg-card border-border">
                  <CardContent className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                    <p className="text-muted-foreground">Writing your Reddit comment...</p>
                  </CardContent>
                </Card>
              )}
              {redditResult && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">Generated Comment</CardTitle>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          {redditResult.recommendedArchetype && <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />}
                          {redditResult.archetype}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{redditResult.wordCount} words</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => generateRedditComment(false)} disabled={generatingReddit}>
                          <RefreshCw className="h-3 w-3 mr-1" />Regenerate
                        </Button>
                        <Button variant="outline" size="sm" onClick={copyReddit}>
                          {copiedReddit ? <><Check className="h-3 w-3 mr-1" />Copied</> : <><Copy className="h-3 w-3 mr-1" />Copy</>}
                        </Button>
                        <Button size="sm" onClick={() => generateRedditComment(true)} disabled={generatingReddit}>
                          <Save className="h-3 w-3 mr-1" />Save
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground bg-muted rounded-lg p-4">
                      {redditResult.comment}
                    </pre>
                  </CardContent>
                </Card>
              )}
              {!generatingReddit && !redditResult && (
                <Card className="bg-card border-border border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm text-muted-foreground">Fill in the thread details and click Generate Comment</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* LinkedIn Tab */}
        <TabsContent value="linkedin" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
            {/* Left: inputs */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">LinkedIn Post</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Paste the LinkedIn post <span className="text-destructive">*</span></Label>
                  <Textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Paste the full LinkedIn post text here..."
                    className="resize-none min-h-[160px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Archetype</Label>
                  <Select value={linkedinArchetype} onValueChange={setLinkedinArchetype}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LINKEDIN_ARCHETYPES.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {linkedinArchetype === "Auto (AI picks)" && (
                    <p className="text-xs text-muted-foreground">AI picks best archetype — highlighted with ★</p>
                  )}
                </div>
                <Button
                  onClick={() => generateLinkedinComments(false)}
                  disabled={generatingLinkedin || !postContent.trim()}
                  className="w-full"
                >
                  {generatingLinkedin ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : "Generate Comments"}
                </Button>
              </CardContent>
            </Card>

            {/* Right: output */}
            <div className="space-y-4">
              {generatingLinkedin && !linkedinResult && (
                <Card className="bg-card border-border">
                  <CardContent className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                    <p className="text-muted-foreground">Writing your LinkedIn comments...</p>
                  </CardContent>
                </Card>
              )}
              {linkedinResult && (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium text-muted-foreground">{linkedinResult.variants?.length} variants generated</h2>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => generateLinkedinComments(false)} disabled={generatingLinkedin}>
                        <RefreshCw className="h-3 w-3 mr-1" />Regenerate
                      </Button>
                      <Button size="sm" onClick={() => generateLinkedinComments(true)} disabled={generatingLinkedin}>
                        <Save className="h-3 w-3 mr-1" />Save All
                      </Button>
                    </div>
                  </div>
                  {linkedinResult.variants?.map((variant, idx) => (
                    <Card key={idx} className={`bg-card border-border ${variant.recommended ? "ring-1 ring-yellow-400/50" : ""}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              {variant.recommended && <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />}
                              {variant.archetype}
                            </Badge>
                            {variant.recommended && <span className="text-xs text-yellow-400 font-medium">AI recommended</span>}
                            <Badge variant="outline" className="text-xs">{variant.wordCount} words</Badge>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => copyLinkedin(idx, variant.body)}>
                            {copiedLinkedin === idx ? <><Check className="h-3 w-3 mr-1" />Copied</> : <><Copy className="h-3 w-3 mr-1" />Copy</>}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">
                          {variant.body}
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
              {!generatingLinkedin && !linkedinResult && (
                <Card className="bg-card border-border border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm text-muted-foreground">Paste a LinkedIn post and click Generate Comments</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">
                {historyLoaded ? `${historyComments.length} saved comments` : "Saved comments"}
              </h2>
              <Button variant="outline" size="sm" onClick={loadHistory} disabled={historyLoading}>
                <RefreshCw className={`h-3 w-3 mr-1 ${historyLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {historyLoading && !historyLoaded && (
              <Card className="bg-card border-border">
                <CardContent className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                  <p className="text-muted-foreground">Loading history...</p>
                </CardContent>
              </Card>
            )}

            {historyLoaded && historyComments.length === 0 && (
              <Card className="bg-card border-border border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-sm text-muted-foreground">No saved comments yet. Generate and save a comment to see it here.</p>
                </CardContent>
              </Card>
            )}

            {historyComments.map((comment) => (
              <Card key={comment.id} className="bg-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${comment.platform === "reddit" ? "text-orange-400 border-orange-500/30" : "text-indigo-400 border-indigo-500/30"}`}>
                        {comment.platform === "reddit" ? "Reddit" : "LinkedIn"}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">{comment.archetype}</Badge>
                      <Badge variant="outline" className="text-xs">{comment.word_count} words</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(comment.generated_comment)
                          setCopiedHistory(comment.id)
                          setTimeout(() => setCopiedHistory(null), 2000)
                        }}
                      >
                        {copiedHistory === comment.id ? <><Check className="h-3 w-3 mr-1" />Copied</> : <><Copy className="h-3 w-3 mr-1" />Copy</>}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => deleteComment(comment.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {comment.trend_title && (
                    <p className="text-xs text-muted-foreground truncate mt-1">Re: {comment.trend_title}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground bg-muted rounded-lg p-4">
                    {comment.generated_comment}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function CommentsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <CommentsContent />
    </Suspense>
  )
}
