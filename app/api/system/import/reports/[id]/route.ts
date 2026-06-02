import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { importErrorResponse } from "@/app/api/system/import/shared/import-api-errors"
import { getSession, requireSystemImportActor } from "@/lib/auth"
import { readImportReport } from "@/lib/import/report-store"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: Request, context: RouteParams) {
  try {
    requireSystemImportActor(await getSession())
    const { id } = await context.params
    const report = await readImportReport(id)
    if (!report) {
      return NextResponse.json(
        { error: "Report not found", code: "REPORT_NOT_FOUND" },
        { status: 404 }
      )
    }
    return NextResponse.json(report)
  } catch (err) {
    return importErrorResponse(err, "GET /api/system/import/reports/[id]")
  }
}
