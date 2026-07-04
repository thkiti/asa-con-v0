import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { PeriodAdminAuthError } from "@/lib/auth"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import {
  applyFinanceVoucherListScope,
  requireFinanceVoucherScope,
} from "@/app/api/finance/shared/voucher-api-scope"
import { parseStockDocumentInquiryQuery } from "@/app/api/finance/stock-documents/shared/parse-inquiry-query"
import { listStockDocumentsForInquiry } from "@/lib/stock/inquiry/stock-document-inquiry"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const filter = applyFinanceVoucherListScope(
      parseStockDocumentInquiryQuery(req.nextUrl.searchParams),
      legalEntityCode
    )
    const result = await listStockDocumentsForInquiry(prisma, filter)
    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return financeErrorResponse(err, "GET finance/stock-documents")
  }
}
