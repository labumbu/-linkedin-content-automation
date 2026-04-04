import { NextRequest } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { HarveyReport } from "@/lib/pdf/HarveyReport"
import { ReportJSON } from "@/lib/research-types"
import React from "react"

export async function POST(req: NextRequest) {
  try {
    const report: ReportJSON = await req.json()

    const buffer = await renderToBuffer(
      React.createElement(HarveyReport, { report })
    )

    const slug = report.topic
      .slice(0, 40)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
    const filename = `harvey-research-${slug}.pdf`

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return new Response(
      JSON.stringify({ error: "PDF generation failed", details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
