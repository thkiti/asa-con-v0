import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { parseTrialBalanceFilter } from "@/lib/finance/reports/report-filter"
import { getTrialBalance } from "@/lib/finance/reports/trial-balance"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const filter = parseTrialBalanceFilter(req.nextUrl.searchParams)
    const result = await getTrialBalance(prisma, filter)
    return NextResponse.json(result)
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET /api/finance/reports/trial-balance")
  }
}
