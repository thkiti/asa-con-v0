import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { getChangesInEquity } from "@/lib/finance/reports/changes-in-equity"
import { parseChangesInEquityFilter } from "@/lib/finance/reports/report-filter"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const filter = parseChangesInEquityFilter(req.nextUrl.searchParams)
    const result = await getChangesInEquity(prisma, filter)
    return NextResponse.json(result)
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET /api/finance/reports/changes-in-equity")
  }
}
