export const PETTY_CASH_VOUCHER_DOCUMENT_CODE = "PCV"

export const PETTY_CASH_VOUCHER_ENTRY_TYPE = "PCV"

export const PETTY_CASH_VOUCHER_TYPE_TITLE = "PETTY CASH VOUCHER"

export type PettyCashVoucherStatusCode =
  | "DRAFT"
  | "SUBMITTED"
  | "CONFIRMED"
  | "POSTED"
  | "CANCELLED"

export const PETTY_CASH_VOUCHER_STATUSES: PettyCashVoucherStatusCode[] = [
  "DRAFT",
  "SUBMITTED",
  "CONFIRMED",
  "POSTED",
  "CANCELLED",
]

export function formatPettyCashVoucherDocumentNo(
  entryNo: string | null | undefined
): string {
  if (entryNo?.trim()) return entryNo.trim()
  return `${PETTY_CASH_VOUCHER_DOCUMENT_CODE} (draft)`
}

export function formatPcvEntryRefNo(entryNo: string | null | undefined): string {
  if (entryNo?.trim()) return entryNo.trim()
  return "Draft / Pending number"
}

export function formatPettyCashVoucherStatusLabel(
  status: PettyCashVoucherStatusCode | string
): string {
  switch (status) {
    case "DRAFT":
      return "Draft"
    case "SUBMITTED":
      return "Submitted"
    case "CONFIRMED":
      return "Confirmed"
    case "POSTED":
      return "Posted"
    case "CANCELLED":
      return "Cancelled"
    default:
      return String(status)
  }
}

export function parsePettyCashVoucherAmount(value: string): number {
  const n = Number(String(value ?? "").trim() || "0")
  return Number.isFinite(n) ? n : 0
}

export function computePettyCashVoucherDebitTotal(
  lines: Array<{ debit: string }>
): number {
  return lines.reduce((sum, line) => sum + parsePettyCashVoucherAmount(line.debit), 0)
}
