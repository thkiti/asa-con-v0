import type { BankDepositSettlementStatus } from "./bank-deposit-settlement"

export function shouldShowBankDepositPostButton(
  status: BankDepositSettlementStatus
): boolean {
  return false
}

export function shouldShowBankDepositPayInButton(
  status: BankDepositSettlementStatus
): boolean {
  return status === "NOT_POSTED"
}

export function bankDepositSettlementActionHint(input: {
  status: BankDepositSettlementStatus
  payInSlipMissingWarning?: boolean
}): string | null {
  if (input.payInSlipMissingWarning) {
    return "Missing slip"
  }

  switch (input.status) {
    case "NOT_POSTED":
      return null
    case "POSTED":
      return "Deposited"
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
