import { NextResponse } from "next/server"
import {
  mapPettyCashVoucherRouteError,
  pettyCashVoucherRouteErrorMessage,
} from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-route-errors"

export function pettyCashVoucherErrorResponse(
  err: unknown,
  logLabel: string
): NextResponse {
  const mapped = mapPettyCashVoucherRouteError(err)
  if (mapped) {
    return NextResponse.json(mapped.body, { status: mapped.status })
  }

  const message = pettyCashVoucherRouteErrorMessage(err)
  console.error(`${logLabel}:`, err)
  return NextResponse.json({ error: message }, { status: 500 })
}
