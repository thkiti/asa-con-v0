import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { ReportError } from "@/lib/reporting/report-errors"
import { getDailyBranchSummary } from "@/lib/reporting/composite"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams
    const branchId = String(params.get("branchId") ?? "").trim()
    const day = params.get("day") ?? params.get("date")

    if (!branchId || !day) {
      return NextResponse.json(
        { error: "branchId and day are required", code: "EMPTY_FILTER" },
        { status: 400 }
      )
    }

    const result = await getDailyBranchSummary(prisma, { branchId, day })

    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof ReportError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : "Daily branch report failed"
    console.error("GET reports/daily-branch error:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
