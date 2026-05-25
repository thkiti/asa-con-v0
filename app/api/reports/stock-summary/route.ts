import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { ReportError } from "@/lib/reporting/report-errors"
import { getStockSummary } from "@/lib/stock/summary"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams
    const branchId = params.get("branchId") ?? undefined
    const productId = params.get("productId") ?? undefined
    const includeNonTracked = params.get("includeNonTracked") === "true"
    const includeZeroQty = params.get("includeZeroQty") === "true"

    const result = await getStockSummary(prisma, {
      branchId,
      productId,
      includeNonTracked,
      includeZeroQty,
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof ReportError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : "Stock summary failed"
    console.error("GET reports/stock-summary error:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
