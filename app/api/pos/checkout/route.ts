import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { PaymentMethod } from "@/generated/prisma/client"
import { getSession } from "@/lib/auth/session"
import { checkout } from "@/lib/pos/checkout"
import { CheckoutError } from "@/lib/pos/checkout-errors"
import type { CheckoutCartLine } from "@/lib/pos/checkout-types"
import { requirePosShopSession } from "@/lib/pos/pos-shop-session"
import { isPosCheckoutPaymentMethod } from "@/lib/pos-ui/pos-payment-methods"

function parseCheckoutLines(raw: unknown): CheckoutCartLine[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((line) => ({
      productId: String((line as { productId?: unknown }).productId ?? "").trim(),
      qty: Math.trunc(Number((line as { qty?: unknown }).qty)),
    }))
    .filter((line) => line.productId.length > 0)
}

function parsePaymentMethod(raw: unknown): PaymentMethod {
  if (raw == null || raw === "") {
    return PaymentMethod.CASH
  }
  const value = String(raw).trim().toUpperCase()
  if (!isPosCheckoutPaymentMethod(value)) {
    throw new CheckoutError("Invalid payment method", "INVALID_PAYMENT_METHOD", 400)
  }
  return value as PaymentMethod
}

function parsePaidAmount(raw: unknown): number | string {
  if (raw == null || raw === "") {
    return 0
  }
  return raw as number | string
}

export async function POST(req: NextRequest) {
  try {
    const session = requirePosShopSession(await getSession())
    const body = (await req.json().catch(() => ({}))) as {
      lines?: unknown
      paymentMethod?: unknown
      paidAmount?: unknown
    }

    const branchId = session.branchId.trim()
    if (!branchId) {
      throw new CheckoutError("Shop session requires branchId", "INVALID_BRANCH", 400)
    }

    const result = await checkout({
      branchId,
      staffId: session.staffId,
      paymentMethod: parsePaymentMethod(body.paymentMethod),
      paidAmount: parsePaidAmount(body.paidAmount),
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
