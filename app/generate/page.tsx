"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { PostCard } from "@/components/post-card"
import { mockTrends } from "@/lib/mock-data"
import { Trend, GeneratedPost, Language, Tone } from "@/lib/types"
import { ArrowLeft, Loader2, RefreshCw, FileText } from "lucide-react"

const tones: Tone[] = ["Direct & Bold", "Data-Driven", "Contrarian", "Storytelling"]
const competitors = ["Salesloft", "Apollo", "Clay", "Lemlist"]

function GenerateContent() {
  const searchParams = useSearchParams()
  const trendId = searchParams.get("trendId")

  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null)
  const [language, setLanguage] = useState<Language>("EN")
  const [tone, setTone] = useState<Tone>("Direct & Bold")
  const [postCount, setPostCount] = useState([4])
  const [includeCompetitor, setIncludeCompetitor] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [posts, setPosts] = useState<GeneratedPost[]>([])

  useEffect(() => {
    if (trendId) {
      const trend = mockTrends.find((t) => t.id === trendId)
      if (trend) setSelectedTrend(trend)
    }
  }, [trendId])

  const generatePosts = async () => {
    if (!selectedTrend) return
    setIsGenerating(true)
    setPosts([])

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trend: selectedTrend,
          language,
          tone,
          postCount: postCount[0],
          includeCompetitor,
        }),
      })

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.trim()) {
            try {
              const post = JSON.parse(line)
              if (!post.error) setPosts((prev) => [...prev, post])
            } catch {}
          }
        }
      }
    } catch (error) {
      console.error("Generation failed:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Change topic
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* Left Panel - Controls */}
        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Post Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selected Trend */}
              {selectedTrend ? (
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Selected Topic
                  </p>
                  <p className="font-medium text-foreground">{selectedTrend.title}</p>
                </div>
              ) : (
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">
                    No topic selected. Pick one from the dashboard.
                  </p>
                </div>
              )}

              {/* Language Toggle */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Language</Label>
                <Tabs value={language} onValueChange={(v) => setLanguage(v as Language)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="EN">English</TabsTrigger>
                    <TabsTrigger value="RU">Russian</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Tone Selector */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Tone</Label>
                <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tones.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Post Count Slider */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Number of Posts</Label>
                  <span className="text-sm font-medium text-foreground">{postCount[0]}</span>
                </div>
                <Slider
                  value={postCount}
                  onValueChange={setPostCount}
                  min={3}
                  max={6}
                  step={1}
                />
              </div>

              {/* Competitor Angle */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="competitor"
                  checked={includeCompetitor}
                  onCheckedChange={(checked) => setIncludeCompetitor(checked as boolean)}
                />
                <Label
                  htmlFor="competitor"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Include competitor angle ({competitors.join(", ")})
                </Label>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generatePosts}
                disabled={isGenerating || !selectedTrend}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Crafting Harvey-voiced posts...
                  </>
                ) : (
                  "Generate Posts"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Generated Posts */}
        <div className="space-y-4">
          {posts.length > 0 && (
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Generated Posts</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={generatePosts}
                disabled={isGenerating}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                Regenerate All
              </Button>
            </div>
          )}

          {posts.length === 0 && !isGenerating ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No posts generated yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Select a topic from the dashboard and configure your settings to generate LinkedIn posts.
                </p>
              </CardContent>
            </Card>
          ) : isGenerating && posts.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Crafting Harvey-voiced posts...</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
              {isGenerating && (
                <Card className="bg-card border-border">
                  <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                    <p className="text-sm text-muted-foreground">Generating more posts...</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GeneratePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <GenerateContent />
    </Suspense>
  )
}
