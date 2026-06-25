import { NextResponse } from "next/server"
import {
  mapInvoiceVoucherRouteError,
  invoiceVoucherRouteErrorMessage,
} from "@/lib/finance/invoice-voucher/invoice-voucher-route-errors"

export function invoiceVoucherErrorResponse(
  err: unknown,
  logLabel: string
): NextResponse {
  const mapped = mapInvoiceVoucherRouteError(err)
  if (mapped) {
    return NextResponse.json(mapped.body, { status: mapped.status })
  }

  const message = invoiceVoucherRouteErrorMessage(err)
  console.error(`${logLabel}:`, err)
  return NextResponse.json({ error: message }, { status: 500 })
}
