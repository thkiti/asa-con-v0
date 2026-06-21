import { NextResponse } from "next/server"
import {
  mapPaymentVoucherRouteError,
  paymentVoucherRouteErrorMessage,
} from "@/lib/finance/payment-voucher/payment-voucher-route-errors"

export function paymentVoucherErrorResponse(
  err: unknown,
  logLabel: string
): NextResponse {
  const mapped = mapPaymentVoucherRouteError(err)
  if (mapped) {
    return NextResponse.json(mapped.body, { status: mapped.status })
  }

  const message = paymentVoucherRouteErrorMessage(err)
  console.error(`${logLabel}:`, err)
  return NextResponse.json({ error: message }, { status: 500 })
}
