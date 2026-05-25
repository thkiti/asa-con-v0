import type { AccountingPeriodStatus } from "./types"

export function formatPeriodStatusLabel(status: AccountingPeriodStatus): string {
  switch (status) {
    case "OPEN":
      return "Open"
    case "SOFT_CLOSED":
      return "Soft closed"
    case "HARD_CLOSED":
      return "Hard closed"
    default:
      return status
  }
}
