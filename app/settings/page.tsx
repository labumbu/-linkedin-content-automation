"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import { Loader2, Plus, X, Trash2, FileText, Globe, Save } from "lucide-react"
import { Settings, KnowledgeItem } from "@/lib/settings"

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingKb, setLoadingKb] = useState(false)

  // Topic cluster input
  const [newTopic, setNewTopic] = useState("")
  // Competitor input
  const [newCompetitor, setNewCompetitor] = useState("")
  // URL input
  const [newUrl, setNewUrl] = useState("")
  const [newUrlName, setNewUrlName] = useState("")
  const [addingUrl, setAddingUrl] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => toast({ title: "Failed to load settings", variant: "destructive" }))

    fetch("/api/knowledge")
      .then((r) => r.json())
      .then(setKnowledge)
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error()
      toast({ title: "Settings saved" })
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const addTopic = () => {
    if (!newTopic.trim() || !settings) return
    setSettings({ ...settings, topic_clusters: [...settings.topic_clusters, newTopic.trim()] })
    setNewTopic("")
  }

  const removeTopic = (i: number) => {
    if (!settings) return
    setSettings({ ...settings, topic_clusters: settings.topic_clusters.filter((_, idx) => idx !== i) })
  }

  const addCompetitor = () => {
    if (!newCompetitor.trim() || !settings) return
    setSettings({ ...settings, competitors: [...settings.competitors, newCompetitor.trim()] })
    setNewCompetitor("")
  }

  const removeCompetitor = (i: number) => {
    if (!settings) return
    setSettings({ ...settings, competitors: settings.competitors.filter((_, idx) => idx !== i) })
  }

  const handleAddUrl = async () => {
    if (!newUrl.trim()) return
    setAddingUrl(true)
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl.trim(), name: newUrlName.trim() || newUrl.trim() }),
      })
      if (!res.ok) throw new Error()
      const item = await res.json()
      setKnowledge((prev) => [item, ...prev])
      setNewUrl("")
      setNewUrlName("")
      toast({ title: "URL added to knowledge base" })
    } catch {
      toast({ title: "Failed to fetch URL", variant: "destructive" })
    } finally {
      setAddingUrl(false)
    }
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPdf(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/knowledge", { method: "POST", body: formData })
      if (!res.ok) throw new Error()
      const item = await res.json()
      setKnowledge((prev) => [item, ...prev])
      toast({ title: `${file.name} added to knowledge base` })
    } catch {
      toast({ title: "Failed to parse PDF", variant: "destructive" })
    } finally {
      setUploadingPdf(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDeleteKb = async (id: string) => {
    await fetch(`/api/knowledge/${id}`, { method: "DELETE" })
    setKnowledge((prev) => prev.filter((item) => item.id !== id))
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure Harvey's brand, topics, and knowledge base
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="brand">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="brand">Brand</TabsTrigger>
          <TabsTrigger value="topics">Topics & Competitors</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
        </TabsList>

        {/* Brand Tab */}
        <TabsContent value="brand" className="space-y-6 mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Harvey Profile</CardTitle>
              <CardDescription>Who is Harvey? What does it do? This feeds directly into the generation prompt.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={settings.harvey_profile}
                onChange={(e) => setSettings({ ...settings, harvey_profile: e.target.value })}
                rows={4}
                placeholder="Harvey is an AI copilot for B2B sales teams..."
              />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Ideal Customer Profile (ICP)</CardTitle>
              <CardDescription>Who does Harvey sell to? Used to make posts more targeted.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={settings.icp}
                onChange={(e) => setSettings({ ...settings, icp: e.target.value })}
                rows={3}
                placeholder="B2B SaaS companies, 10-200 employees, sales-led growth..."
              />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Voice Rules</CardTitle>
              <CardDescription>Specific rules for how Harvey writes. The more specific, the better.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={settings.voice_rules}
                onChange={(e) => setSettings({ ...settings, voice_rules: e.target.value })}
                rows={4}
                placeholder="Direct and confident. No fluff. Use data points. Short sentences..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Topics & Competitors Tab */}
        <TabsContent value="topics" className="space-y-6 mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Topic Clusters</CardTitle>
              <CardDescription>Keywords Claude searches for when fetching trends. Be specific.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {settings.topic_clusters.map((topic, i) => (
                  <Badge key={i} variant="secondary" className="flex items-center gap-1 pr-1">
                    {topic}
                    <button onClick={() => removeTopic(i)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTopic()}
                  placeholder="e.g. AI SDR 2026"
                />
                <Button variant="outline" size="icon" onClick={addTopic}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Competitors</CardTitle>
              <CardDescription>Used when "Include competitor angle" is checked in post generation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {settings.competitors.map((comp, i) => (
                  <Badge key={i} variant="secondary" className="flex items-center gap-1 pr-1">
                    {comp}
                    <button onClick={() => removeCompetitor(i)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newCompetitor}
                  onChange={(e) => setNewCompetitor(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
                  placeholder="e.g. Outreach"
                />
                <Button variant="outline" size="icon" onClick={addCompetitor}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge" className="space-y-6 mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Upload PDF</CardTitle>
              <CardDescription>Company decks, one-pagers, battle cards. Text is extracted and injected into Claude's context.</CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handlePdfUpload}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPdf}
              >
                {uploadingPdf ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                {uploadingPdf ? "Parsing PDF..." : "Choose PDF"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Add Website</CardTitle>
              <CardDescription>Harvey's website, landing page, or any relevant URL. Content is fetched and stored.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Name</Label>
                <Input
                  value={newUrlName}
                  onChange={(e) => setNewUrlName(e.target.value)}
                  placeholder="e.g. Harvey Homepage"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                    placeholder="https://..."
                  />
                  <Button variant="outline" onClick={handleAddUrl} disabled={addingUrl}>
                    {addingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {knowledge.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Saved Items ({knowledge.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {knowledge.map((item, i) => (
                  <div key={item.id}>
                    {i > 0 && <Separator className="my-2" />}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.type === "pdf" ? (
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString("en-US", {
                              month: "short", day: "numeric",
                            })} · {item.content.length.toLocaleString()} chars extracted
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleDeleteKb(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
