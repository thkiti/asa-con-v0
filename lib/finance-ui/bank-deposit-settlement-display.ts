import type { BankDepositSettlementStatus } from "./bank-deposit-settlement"

export function shouldShowBankDepositPostButton(
  status: BankDepositSettlementStatus
): boolean {
  return status === "NOT_POSTED"
}

export function bankDepositSettlementActionHint(
  status: BankDepositSettlementStatus
): string | null {
  switch (status) {
    case "NOT_POSTED":
      return null
    case "POSTED":
      return "Posted"
    case "VARIANCE":
      return "Variance — review journal before reposting"
    case "INVALID_SOURCE":
      return "Not eligible for bank deposit"
    case "NOT_ELIGIBLE":
      return "Collector pickup not posted"
    default:
      return null
  }
}
