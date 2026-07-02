import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { traceFinanceDocument } from "@/lib/finance/audit/document-trace"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope()
    const query = req.nextUrl.searchParams.get("query") ?? ""

    const result = await traceFinanceDocument(prisma, {
      query,
      legalEntityCode,
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET finance/audit/document-trace error")
  }
}
