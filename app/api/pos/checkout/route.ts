import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { PaymentMethod } from "@/generated/prisma/client"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { checkout } from "@/lib/pos/checkout"
import { CheckoutError } from "@/lib/pos/checkout-errors"
import type { CheckoutCartLine } from "@/lib/pos/checkout-types"

function parsePaymentMethod(raw: unknown): PaymentMethod {
  const value = String(raw ?? "").trim().toUpperCase()
  if ((Object.values(PaymentMethod) as string[]).includes(value)) {
    return value as PaymentMethod
  }
  throw new CheckoutError("Invalid payment method", "INVALID_PAYMENT_METHOD", 400)
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      branchId?: string
      staffId?: string
      paymentMethod?: string
      paidAmount?: number | string
      lines?: CheckoutCartLine[]
    }

    const result = await checkout({
      branchId: String(body.branchId ?? ""),
      staffId: body.staffId ?? null,
      paymentMethod: parsePaymentMethod(body.paymentMethod),
      paidAmount: body.paidAmount ?? 0,
      lines: Array.isArray(body.lines) ? body.lines : [],
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof CheckoutError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    if (err instanceof FinancePostingError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : "Checkout failed"
    console.error("POST pos/checkout error:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}