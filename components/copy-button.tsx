"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"

export function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
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
  )
}
