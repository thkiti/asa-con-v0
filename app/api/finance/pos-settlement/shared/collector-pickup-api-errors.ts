import { NextResponse } from "next/server"
import {
  collectorPickupRouteErrorMessage,
  mapCollectorPickupRouteError,
} from "@/lib/finance/pos-settlement/collector-pickup-route-errors"

export function collectorPickupSettlementErrorResponse(
  err: unknown,
  logLabel: string
): NextResponse {
  const mapped = mapCollectorPickupRouteError(err)
  if (mapped) {
    return NextResponse.json(mapped.body, { status: mapped.status })
  }

  const message = collectorPickupRouteErrorMessage(err)
  console.error(`${logLabel}:`, err)
  return NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 })
}
