import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { PeriodAdminAuthError } from "@/lib/auth"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { getStockDocumentInquiryDetail } from "@/lib/stock/inquiry/stock-document-inquiry-detail"
import { prisma } from "@/lib/shared/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { legalEntityCode } = await requireFinanceVoucherScope(req)
    const { id } = await context.params
    const detail = await getStockDocumentInquiryDetail(
      prisma,
      id,
      legalEntityCode
    )

    if (!detail) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json(detail)
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return financeErrorResponse(err, "GET finance/stock-documents/[id]")
  }
}
