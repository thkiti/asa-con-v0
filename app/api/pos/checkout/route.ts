import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { PaymentMethod } from "@/generated/prisma/client"
import { getSession } from "@/lib/auth/session"
import { checkout } from "@/lib/pos/checkout"
import { CheckoutError } from "@/lib/pos/checkout-errors"
import type { CheckoutCartLine } from "@/lib/pos/checkout-types"
import { requireStockDocumentSession } from "@/lib/stock/document-read"

function parseCheckoutLines(raw: unknown): CheckoutCartLine[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((line) => ({
      productId: String((line as { productId?: unknown }).productId ?? "").trim(),
      qty: Math.trunc(Number((line as { qty?: unknown }).qty)),
    }))
    .filter((line) => line.productId.length > 0)
}

export async function POST(req: NextRequest) {
  try {
    const session = requireStockDocumentSession(await getSession())
    const body = (await req.json().catch(() => ({}))) as {
      lines?: unknown
    }

    const branchId = session.branchId.trim()
    if (!branchId) {
      throw new CheckoutError("Shop session requires branchId", "INVALID_BRANCH", 400)
    }

    const result = await checkout({
      branchId,
      staffId: session.staffId,
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 0,
      lines: parseCheckoutLines(body.lines),
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof CheckoutError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return posApiErrorResponse(err, "POST /api/pos/checkout")
  }
}
