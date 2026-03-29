"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Check, ThumbsUp, ThumbsDown } from "lucide-react"
import { GeneratedPost } from "@/lib/types"

interface PostCardProps {
  post: GeneratedPost
}

export function PostCard({ post }: PostCardProps) {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(post.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
          {post.content}
        </pre>
      </CardContent>
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
            className={feedback === "up" ? "text-emerald-400" : "text-muted-foreground"}
            onClick={() => setFeedback(feedback === "up" ? null : "up")}
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={feedback === "down" ? "text-red-400" : "text-muted-foreground"}
            onClick={() => setFeedback(feedback === "down" ? null : "down")}
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
