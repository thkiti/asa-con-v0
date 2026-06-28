import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import { toMoney, ZERO } from "@/lib/finance/decimal"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "./pos-settlement-errors"

/**
 * Collector pickup uses CASH-only grandTotal from a persisted COLLECT report.
 * Card / transfer / OTHER buckets in paymentLines are excluded by design.
 */
export function extractCollectorPickupCashAmount(
  report: ReadReportPayload
): ReturnType<typeof toMoney> {
  if (report.mode !== "COLLECT") {
    throw new PosSettlementError(
      "Collector pickup requires a COLLECT mode collector report",
      PosSettlementErrorCodes.INVALID_SOURCE
    )
  }

  const cashAmount = toMoney(report.grandTotal)
  if (cashAmount.lte(ZERO)) {
    throw new PosSettlementError(
      "Collector pickup cash amount must be greater than zero",
      PosSettlementErrorCodes.INVALID_AMOUNT
    )
  }

  return cashAmount
}
