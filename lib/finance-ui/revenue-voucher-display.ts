export const REVENUE_VOUCHER_DOCUMENT_CODE = "REV"

export const REVENUE_VOUCHER_ENTRY_TYPE = "REV"

export const REVENUE_VOUCHER_TYPE_TITLE = "REVENUE VOUCHER"

export type RevenueVoucherStatusCode =
  | "DRAFT"
  | "SUBMITTED"
  | "CONFIRMED"
  | "POSTED"
  | "CANCELLED"

export const REVENUE_VOUCHER_STATUSES: RevenueVoucherStatusCode[] = [
  "DRAFT",
  "SUBMITTED",
  "CONFIRMED",
  "POSTED",
  "CANCELLED",
]

export function formatRevenueVoucherDocumentNo(
  entryNo: string | null | undefined
): string {
  if (entryNo?.trim()) return entryNo.trim()
  return `${REVENUE_VOUCHER_DOCUMENT_CODE} (draft)`
}

export function formatRevEntryRefNo(entryNo: string | null | undefined): string {
  if (entryNo?.trim()) return entryNo.trim()
  return "Draft / Pending number"
}

export function formatRevenueVoucherTypeLabel(): string {
  return `${REVENUE_VOUCHER_DOCUMENT_CODE} — Revenue Voucher`
}

export function formatRevenueVoucherStatusLabel(
  status: RevenueVoucherStatusCode | string
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

export function parseRevenueVoucherAmount(value: string): number {
  const n = Number(String(value ?? "").trim() || "0")
  return Number.isFinite(n) ? n : 0
}

export function computeRevenueVoucherCreditTotal(
  lines: Array<{ credit: string }>
): number {
  return lines.reduce((sum, line) => sum + parseRevenueVoucherAmount(line.credit), 0)
}

export function formatReceiveToAccountLabel(
  accountCode: string | null | undefined,
  accountName: string | null | undefined
): string {
  const code = accountCode?.trim() ?? ""
  const name = accountName?.trim() ?? ""
  if (code && name) return `${code} • ${name}`
  return code || name || "—"
}
