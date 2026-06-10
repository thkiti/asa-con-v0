import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { getGeneralLedger } from "@/lib/finance/reports/general-ledger"
import { parseGeneralLedgerFilter } from "@/lib/finance/reports/report-filter"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const filter = parseGeneralLedgerFilter(req.nextUrl.searchParams)
    const result = await getGeneralLedger(prisma, filter)
    return NextResponse.json(result)
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET /api/finance/reports/general-ledger")
  }
}
