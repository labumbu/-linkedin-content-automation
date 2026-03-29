import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { History, ThumbsUp, ThumbsDown } from "lucide-react"
import { CopyButton } from "@/components/copy-button"

async function getPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) return []
  return data
}

export default async function HistoryPage() {
  const posts = await getPosts()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Post History</h1>
        <p className="text-muted-foreground mt-1">
          Your last {posts.length} generated posts
        </p>
      </div>

      {posts.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No posts yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Generated posts will appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <p className="font-medium text-foreground text-sm">{post.trend_title}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {post.language}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {post.tone}
                    </Badge>
                    {post.feedback === "up" && (
                      <ThumbsUp className="h-4 w-4 text-emerald-400" />
                    )}
                    {post.feedback === "down" && (
                      <ThumbsDown className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </CardHeader>
              <CardContent className="pb-4">
                <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
                  {post.content}
                </pre>
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t border-border pt-4">
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {post.character_count} characters
                </Badge>
                <CopyButton content={post.content} />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
