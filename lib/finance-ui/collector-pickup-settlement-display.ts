import type { CollectorPickupSettlementStatus } from "./collector-pickup-settlement"
import type { BankDepositSettlementStatus } from "./bank-deposit-settlement"

export function shouldShowCollectorPickupPostButton(
  status: CollectorPickupSettlementStatus
): boolean {
  return status === "NOT_POSTED"
}

export function shouldShowPayInButton(input: {
  pickupStatus: CollectorPickupSettlementStatus
  depositStatus: BankDepositSettlementStatus
}): boolean {
  return (
    input.pickupStatus === "POSTED" &&
    input.depositStatus === "NOT_POSTED"
  )
}

export function collectorPickupSettlementActionHint(input: {
  pickupStatus: CollectorPickupSettlementStatus
  depositStatus: BankDepositSettlementStatus
  payInSlipMissingWarning?: boolean
}): string | null {
  if (input.payInSlipMissingWarning) {
    return "Missing slip"
  }

  switch (input.pickupStatus) {
    case "NOT_POSTED":
      return null
    case "POSTED":
      if (input.depositStatus === "POSTED") {
        return "Deposited"
      }
      if (input.depositStatus === "NOT_POSTED") {
        return null
      }
      if (input.depositStatus === "NOT_ELIGIBLE") {
        return "Awaiting pickup post"
      }
      if (input.depositStatus === "VARIANCE") {
        return "Deposit variance — review journal"
      }
      return "Posted"
    case "VARIANCE":
      return "Pickup variance — review journal before reposting"
    case "INVALID_SOURCE":
      return "Not eligible for settlement"
    default:
      return null
  }
}

/** @deprecated Use collectorPickupSettlementActionHint with deposit context */
export function collectorPickupSettlementActionHintLegacy(
  status: CollectorPickupSettlementStatus
): string | null {
  return collectorPickupSettlementActionHint({
    pickupStatus: status,
    depositStatus: "NOT_ELIGIBLE",
  })
}
