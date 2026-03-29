"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { TrendCard } from "@/components/trend-card"
import { TrendCardSkeleton } from "@/components/trend-card-skeleton"
import { Trend } from "@/lib/types"
import { RefreshCw } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function DashboardPage() {
  const [trends, setTrends] = useState<Trend[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTrends = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/trends")
      if (!res.ok) throw new Error("Failed to fetch trends")
      const data = await res.json()
      if (data.trends) setTrends(data.trends)
    } catch {
      toast({
        title: "Failed to load trends",
        description: "Check your API key and try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrends()
  }, [fetchTrends])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {"What's trending in AI Sales right now"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover hot topics and generate on-brand LinkedIn posts
          </p>
        </div>
        <Button
          onClick={fetchTrends}
          disabled={isLoading}
          variant="outline"
          className="shrink-0"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Trends
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <TrendCardSkeleton key={i} />)
          : trends.map((trend) => <TrendCard key={trend.id} trend={trend} />)}
      </div>
    </div>
  )
}
