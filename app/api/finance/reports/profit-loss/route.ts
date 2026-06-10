import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { getProfitLoss } from "@/lib/finance/reports/profit-loss"
import { parseProfitLossFilter } from "@/lib/finance/reports/report-filter"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const filter = parseProfitLossFilter(req.nextUrl.searchParams)
    const result = await getProfitLoss(prisma, filter)
    return NextResponse.json(result)
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET /api/finance/reports/profit-loss")
  }
}
