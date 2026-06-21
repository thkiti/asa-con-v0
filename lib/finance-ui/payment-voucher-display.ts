/** PAV document display helpers — mirrors MJV pattern in manual-journal-entry-display. */
export const PAYMENT_VOUCHER_DOCUMENT_CODE = "PAV"

export const PAYMENT_VOUCHER_ENTRY_TYPE = "PAV"

export const PAYMENT_VOUCHER_TYPE_TITLE = "PAYMENT VOUCHER"

export type PaymentVoucherStatusCode =
  | "DRAFT"
  | "SUBMITTED"
  | "CONFIRMED"
  | "POSTED"
  | "CANCELLED"

export const PAYMENT_VOUCHER_STATUSES: PaymentVoucherStatusCode[] = [
  "DRAFT",
  "SUBMITTED",
  "CONFIRMED",
  "POSTED",
  "CANCELLED",
]

export function formatPaymentVoucherDocumentNo(
  entryNo: string | null | undefined
): string {
  if (entryNo?.trim()) return entryNo.trim()
  return `${PAYMENT_VOUCHER_DOCUMENT_CODE} (draft)`
}

export function formatPavEntryRefNo(entryNo: string | null | undefined): string {
  if (entryNo?.trim()) return entryNo.trim()
  return "Draft / Pending number"
}

export function formatPaymentVoucherTypeLabel(): string {
  return `${PAYMENT_VOUCHER_DOCUMENT_CODE} — Payment Voucher`
}

export function formatPaymentVoucherStatusLabel(
  status: PaymentVoucherStatusCode | string
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

export function parsePaymentVoucherAmount(value: string): number {
  const n = Number(String(value ?? "").trim() || "0")
  return Number.isFinite(n) ? n : 0
}

export function computePaymentVoucherDebitTotal(
  lines: Array<{ debit: string }>
): number {
  return lines.reduce((sum, line) => sum + parsePaymentVoucherAmount(line.debit), 0)
}

export function formatPayFromAccountLabel(
  accountCode: string | null | undefined,
  accountName: string | null | undefined
): string {
  const code = accountCode?.trim() ?? ""
  const name = accountName?.trim() ?? ""
  if (code && name) return `${code} — ${name}`
  return code || name || "—"
}
