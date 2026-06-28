import { NextResponse } from "next/server"
import {
  bankDepositRouteErrorMessage,
  mapBankDepositRouteError,
} from "@/lib/finance/pos-settlement/bank-deposit-route-errors"

export function bankDepositSettlementErrorResponse(
  err: unknown,
  logLabel: string
): NextResponse {
  const mapped = mapBankDepositRouteError(err)
  if (mapped) {
    return NextResponse.json(mapped.body, { status: mapped.status })
  }

  const message = bankDepositRouteErrorMessage(err)
  console.error(`${logLabel}:`, err)
  return NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 })
}
