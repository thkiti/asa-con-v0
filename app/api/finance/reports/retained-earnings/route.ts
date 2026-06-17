import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { getRetainedEarnings } from "@/lib/finance/reports/retained-earnings"
import { parseRetainedEarningsFilter } from "@/lib/finance/reports/report-filter"
import { resolveReportSessionLegalEntityCode } from "@/lib/finance/reports/report-session"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const legalEntityCode = await resolveReportSessionLegalEntityCode()
    const filter = parseRetainedEarningsFilter(req.nextUrl.searchParams, legalEntityCode)
    const result = await getRetainedEarnings(prisma, filter)
    return NextResponse.json(result)
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET /api/finance/reports/retained-earnings")
  }
}
