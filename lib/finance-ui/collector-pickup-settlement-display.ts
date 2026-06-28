import type { CollectorPickupSettlementStatus } from "./collector-pickup-settlement"

export function shouldShowCollectorPickupPostButton(
  status: CollectorPickupSettlementStatus
): boolean {
  return status === "NOT_POSTED"
}

export function collectorPickupSettlementActionHint(
  status: CollectorPickupSettlementStatus
): string | null {
  switch (status) {
    case "NOT_POSTED":
      return null
    case "POSTED":
      return "Posted"
    case "VARIANCE":
      return "Variance — review journal before reposting"
    case "INVALID_SOURCE":
      return "Not eligible for settlement"
    default:
      return null
  }
}
