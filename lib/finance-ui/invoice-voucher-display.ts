export const INVOICE_VOUCHER_DOCUMENT_CODE = "INV"

export const INVOICE_VOUCHER_ENTRY_TYPE = "INV"

export const INVOICE_VOUCHER_TYPE_TITLE = "INVOICE"

export type InvoiceVoucherStatusCode =
  | "DRAFT"
  | "SUBMITTED"
  | "CONFIRMED"
  | "POSTED"
  | "CANCELLED"

export const INVOICE_VOUCHER_STATUSES: InvoiceVoucherStatusCode[] = [
  "DRAFT",
  "SUBMITTED",
  "CONFIRMED",
  "POSTED",
  "CANCELLED",
]

export function formatInvoiceVoucherDocumentNo(
  entryNo: string | null | undefined
): string {
  if (entryNo?.trim()) return entryNo.trim()
  return `${INVOICE_VOUCHER_DOCUMENT_CODE} (draft)`
}

export function formatInvEntryRefNo(entryNo: string | null | undefined): string {
  if (entryNo?.trim()) return entryNo.trim()
  return "Draft / Pending number"
}

export function formatInvoiceVoucherTypeLabel(): string {
  return `${INVOICE_VOUCHER_DOCUMENT_CODE} — Finance Invoice`
}

export function formatInvoiceVoucherStatusLabel(
  status: InvoiceVoucherStatusCode | string
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

export function parseInvoiceVoucherAmount(value: string): number {
  const n = Number(String(value ?? "").trim() || "0")
  return Number.isFinite(n) ? n : 0
}

export function computeInvoiceVoucherCreditTotal(
  lines: Array<{ credit: string }>
): number {
  return lines.reduce((sum, line) => sum + parseInvoiceVoucherAmount(line.credit), 0)
}

export function computeInvoiceVoucherDebitTotal(
  lines: Array<{ debit: string }>
): number {
  return lines.reduce((sum, line) => sum + parseInvoiceVoucherAmount(line.debit), 0)
}

export function computeInvoiceVoucherLineTotals(
  lines: Array<{ debit: string; credit: string }>
): { debit: number; credit: number; difference: number; balanced: boolean } {
  const debit = computeInvoiceVoucherDebitTotal(lines)
  const credit = computeInvoiceVoucherCreditTotal(lines)
  const difference = debit - credit
  return {
    debit,
    credit,
    difference,
    balanced: Math.abs(difference) < 0.0001,
  }
}
