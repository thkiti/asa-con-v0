import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { buildReconciliationIssuesResult } from "@/app/api/finance/shared/reconciliation-issues-response"
import { parseReconciliationIssuesFilter } from "@/app/api/finance/shared/parse-reconciliation-issues-filter"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const filter = parseReconciliationIssuesFilter(req.nextUrl.searchParams)
    const result = await buildReconciliationIssuesResult(prisma, filter)
    return NextResponse.json(result)
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET finance/reconciliation/issues error")
  }
}
