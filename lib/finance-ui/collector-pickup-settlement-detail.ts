import type { CollectorPickupSettlementReconciliation } from "./collector-pickup-settlement"
import type { BankDepositSettlementStatus } from "./bank-deposit-settlement"
import type { CollectorPickupSettlementStatus } from "./collector-pickup-settlement"

export type SettlementJournalPairDisplay = {
  debitAccount: string
  creditAccount: string
  debitAmount: string
  creditAmount: string
  posted: boolean
}

export function formatPickupSettlementStatus(
  status: CollectorPickupSettlementStatus
): string {
  switch (status) {
    case "POSTED":
      return "Posted"
    case "NOT_POSTED":
      return "Not posted"
    case "VARIANCE":
      return "Variance"
    case "INVALID_SOURCE":
      return "Invalid source"
    default:
      return status
  }
}

export function formatDepositSettlementStatus(
  status: BankDepositSettlementStatus
): string {
  switch (status) {
    case "POSTED":
      return "Posted"
    case "NOT_POSTED":
      return "Not posted"
    case "NOT_ELIGIBLE":
      return "Not eligible (pickup not posted)"
    case "VARIANCE":
      return "Variance"
    default:
      return status
  }
}

export function buildPickupJournalDisplay(
  row: CollectorPickupSettlementReconciliation
): SettlementJournalPairDisplay {
  const posted =
    row.voucherId != null &&
    (row.status === "POSTED" || row.status === "VARIANCE")

  return {
    debitAccount: "1031",
    creditAccount: "1001",
    debitAmount: row.glDebitCashInTransit1031,
    creditAmount: row.glCreditCashDrawer1001,
    posted,
  }
}

export function buildDepositJournalDisplay(
  row: CollectorPickupSettlementReconciliation
): SettlementJournalPairDisplay {
  const posted =
    row.bankDepositVoucherId != null &&
    (row.depositStatus === "POSTED" || row.depositStatus === "VARIANCE")

  return {
    debitAccount: row.bankAccountCode?.trim() || "1021",
    creditAccount: "1031",
    debitAmount: row.glDebitBank1021,
    creditAmount: row.glCreditCashInTransit1031,
    posted,
  }
}

export function formatPayInEvidenceStatusLabel(
  row: CollectorPickupSettlementReconciliation
): string {
  if (row.payInEvidenceStatus === "UPLOADED") return "Uploaded"
  if (row.payInSlipMissingWarning) return "Missing (deposit posted without slip)"
  return "Not uploaded"
}

const SETTLEMENT_ACCOUNT_LABELS: Record<string, string> = {
  "1001": "1001 Cash in Drawer",
  "1021": "1021 Bank",
  "1031": "1031 Cash in Transit",
}

export function formatSettlementAccountLabel(accountCode: string): string {
  const code = accountCode.trim()
  return SETTLEMENT_ACCOUNT_LABELS[code] ?? code
}

export function formatSettlementJournalLine(
  side: "Dr" | "Cr",
  accountCode: string,
  amount: string
): string {
  const label = formatSettlementAccountLabel(accountCode)
  return `${side} ${label}    ${amount}`
}
