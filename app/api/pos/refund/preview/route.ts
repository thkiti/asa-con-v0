import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { getRefundPreview } from "@/lib/pos/refund"
import { RefundError } from "@/lib/pos/refund-errors"
import { prisma } from "@/lib/shared/prisma"
import { requireStockDocumentSession } from "@/lib/stock/document-read"

export async function GET(req: NextRequest) {
  try {
    const session = requireStockDocumentSession(await getSession())
    const saleId = req.nextUrl.searchParams.get("saleId")?.trim() ?? ""
    const receiptNo = req.nextUrl.searchParams.get("receiptNo")?.trim() ?? ""
    const branchId = session.branchId.trim()

    if (!branchId) {
      throw new RefundError("Shop session requires branchId", "MISSING_BRANCH", 400)
    }

    let resolvedSaleId = saleId
    if (!resolvedSaleId && receiptNo) {
      const receipt = await prisma.receipt.findFirst({
        where: { branchId, receiptNo },
        select: { saleId: true },
      })
      if (!receipt) {
        throw new RefundError("Sale not found", "SALE_NOT_FOUND", 404)
      }
      resolvedSaleId = receipt.saleId
    }

    if (!resolvedSaleId) {
      throw new RefundError(
        "Original receipt is required for refund",
        "RECEIPT_REQUIRED_FOR_REFUND",
        400
      )
    }

    const preview = await getRefundPreview(prisma, { saleId: resolvedSaleId, branchId })
    return NextResponse.json(preview)
  } catch (err: unknown) {
    if (err instanceof RefundError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return posApiErrorResponse(err, "GET /api/pos/refund/preview")
  }
}
