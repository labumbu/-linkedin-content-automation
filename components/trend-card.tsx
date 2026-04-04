"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, Flame, TrendingUp, Minus, ArrowUp, MessageSquare } from "lucide-react"
import { Trend } from "@/lib/types"
import { cn } from "@/lib/utils"

interface TrendCardProps {
  trend: Trend
}

const sourceColors: Record<Trend["source"], string> = {
  "Web Search": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Twitter: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  Reddit: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  LinkedIn: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
}

const velocityConfig = {
  hot: { icon: Flame, label: "Hot", className: "text-orange-400" },
  rising: { icon: TrendingUp, label: "Rising", className: "text-emerald-400" },
  stable: { icon: Minus, label: "Stable", className: "text-muted-foreground" },
}

function getScoreColor(score: number): string {
  if (score >= 8) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
  if (score >= 5) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
  return "bg-red-500/20 text-red-400 border-red-500/30"
}

export function TrendCard({ trend }: TrendCardProps) {
  const router = useRouter()
  const VelocityIcon = velocityConfig[trend.velocity].icon

  const handleSelect = () => {
    sessionStorage.setItem("selectedTrend", JSON.stringify(trend))
    router.push(`/generate?trendId=${trend.id}`)
  }

  return (
    <Card className="flex flex-col bg-card border-border hover:border-muted-foreground/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground leading-tight">
            {trend.title}
          </h3>
          <div className={cn("flex items-center gap-1", velocityConfig[trend.velocity].className)}>
            <VelocityIcon className="h-4 w-4" />
            <span className="text-xs font-medium">{velocityConfig[trend.velocity].label}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {trend.summary}
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 pt-0">
        <div className="flex items-center justify-between w-full">
          <Badge variant="outline" className={cn("text-xs", sourceColors[trend.source])}>
            {trend.source}
          </Badge>
          <Badge variant="outline" className={cn("text-xs", getScoreColor(trend.relevanceScore))}>
            Score: {trend.relevanceScore}/10
          </Badge>
        </div>
        {(trend.upvotes != null || trend.comments != null) && (
          <div className="flex items-center gap-3 w-full text-xs text-muted-foreground">
            {trend.upvotes != null && (
              <span className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                {trend.upvotes.toLocaleString()}
              </span>
            )}
            {trend.comments != null && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {trend.comments.toLocaleString()}
              </span>
            )}
          </div>
        )}
        <Button onClick={handleSelect} className="w-full" size="sm">
          Generate Posts
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}
