import { NextResponse } from "next/server"
import {
  mapRevenueVoucherRouteError,
  revenueVoucherRouteErrorMessage,
} from "@/lib/finance/revenue-voucher/revenue-voucher-route-errors"

export function revenueVoucherErrorResponse(
  err: unknown,
  logLabel: string
): NextResponse {
  const mapped = mapRevenueVoucherRouteError(err)
  if (mapped) {
    return NextResponse.json(mapped.body, { status: mapped.status })
  }

  const message = revenueVoucherRouteErrorMessage(err)
  console.error(`${logLabel}:`, err)
  return NextResponse.json({ error: message }, { status: 500 })
}
