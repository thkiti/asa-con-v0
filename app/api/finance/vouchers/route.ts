import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { PeriodAdminAuthError } from "@/lib/auth"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import {
  applyFinanceVoucherListScope,
  requireFinanceVoucherScope,
} from "@/app/api/finance/shared/voucher-api-scope"
import { parseFinanceVoucherListQuery } from "@/app/api/finance/vouchers/shared/parse-voucher-list-query"
import {
  assertFinanceDocumentInquiryDocTypeRequired,
  assertFinanceDocumentInquiryRecBranchRequired,
  listFinanceDocuments,
} from "@/lib/finance/inquiry/finance-document-inquiry"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope()
    const filter = applyFinanceVoucherListScope(
      parseFinanceVoucherListQuery(req.nextUrl.searchParams),
      legalEntityCode
    )
    assertFinanceDocumentInquiryDocTypeRequired(filter)
    assertFinanceDocumentInquiryRecBranchRequired(filter)
    const result = await listFinanceDocuments(prisma, filter)
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
