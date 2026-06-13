import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { getCashFlow } from "@/lib/finance/reports/cash-flow"
import { parseCashFlowFilter } from "@/lib/finance/reports/report-filter"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const filter = parseCashFlowFilter(req.nextUrl.searchParams)
    const result = await getCashFlow(prisma, filter)
    return NextResponse.json(result)
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET /api/finance/reports/cash-flow")
  }
}
