import { Card, CardContent } from "@/components/ui/card"
import { History } from "lucide-react"

export default function HistoryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Post History
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage your previously generated posts
        </p>
      </div>

      <Card className="bg-card border-border border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <History className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Coming Soon
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Post history and analytics will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
