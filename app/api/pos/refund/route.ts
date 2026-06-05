import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { createRefund } from "@/lib/pos/refund"
import { RefundError } from "@/lib/pos/refund-errors"
import { requireStockDocumentSession } from "@/lib/stock/document-read"

function parseOptionalBodyAmount(raw: unknown): string | number | undefined {
  if (raw === null || raw === undefined) return undefined
  if (typeof raw === "string" && raw.trim() === "") return undefined
  return raw as string | number
}

export async function POST(req: NextRequest) {
  try {
    const session = requireStockDocumentSession(await getSession())
    const body = (await req.json().catch(() => ({}))) as {
      saleId?: unknown
      amount?: unknown
      reason?: unknown
    }

    const branchId = session.branchId.trim()
    if (!branchId) {
      throw new RefundError("Shop session requires branchId", "MISSING_BRANCH", 400)
    }

    const saleId =
      body.saleId != null && String(body.saleId).trim() !== ""
        ? String(body.saleId).trim()
        : undefined

    if (!saleId) {
      throw new RefundError(
        "Original receipt is required for refund",
        "RECEIPT_REQUIRED_FOR_REFUND",
        400
      )
    }

    const refund = await createRefund({
      saleId,
      branchId,
      staffId: session.staffId,
      amount: parseOptionalBodyAmount(body.amount),
      reason:
        body.reason != null && String(body.reason).trim() !== ""
          ? String(body.reason).trim()
          : null,
    })

    return NextResponse.json({
      refund: {
        ...refund,
        amount: refund.amount.toFixed(2),
      },
    })
  } catch (err: unknown) {
    if (err instanceof RefundError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return posApiErrorResponse(err, "POST /api/pos/refund")
  }
}
