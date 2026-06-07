import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { parseReconciliationFilter } from "@/app/api/finance/shared/parse-finance-filter"
import { reconcileRefunds } from "@/lib/finance/reconciliation"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const filter = parseReconciliationFilter(req.nextUrl.searchParams)
    const result = await reconcileRefunds(prisma, filter)
    return NextResponse.json(result)
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET finance/reconciliation/refunds error")
  }
}
