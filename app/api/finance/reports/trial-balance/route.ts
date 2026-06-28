import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { applyReportBranchScope } from "@/lib/finance/reports/report-branch-scope"
import { parseTrialBalanceFilter } from "@/lib/finance/reports/report-filter"
import { resolveReportSessionLegalEntityCode } from "@/lib/finance/reports/report-session"
import { getTrialBalance } from "@/lib/finance/reports/trial-balance"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const legalEntityCode = await resolveReportSessionLegalEntityCode()
    const parsed = parseTrialBalanceFilter(req.nextUrl.searchParams, legalEntityCode)
    const filter = await applyReportBranchScope(prisma, parsed)
    const result = await getTrialBalance(prisma, filter)
    return NextResponse.json(result)
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET /api/finance/reports/trial-balance")
  }
}
