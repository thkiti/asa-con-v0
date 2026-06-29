import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { PeriodAdminAuthError } from "@/lib/auth"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import {
  applyFinanceVoucherListScope,
  requireFinanceVoucherScope,
} from "@/app/api/finance/shared/voucher-api-scope"
import { parseFinanceVoucherListQuery } from "@/app/api/finance/vouchers/shared/parse-voucher-list-query"
import { listFinanceVouchers } from "@/lib/finance/inquiry/voucher-list"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope()
    const filter = applyFinanceVoucherListScope(
      parseFinanceVoucherListQuery(req.nextUrl.searchParams),
      legalEntityCode
    )
    const result = await listFinanceVouchers(prisma, filter)
    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return financeErrorResponse(err, "GET finance/vouchers")
  }
}
