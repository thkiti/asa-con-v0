export const PETTY_CASH_VOUCHER_DOCUMENT_CODE = "PCV"

export const PETTY_CASH_VOUCHER_ENTRY_TYPE = "PCV"

export const PETTY_CASH_VOUCHER_TYPE_TITLE = "PETTY CASH"

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

export function computePettyCashVoucherCreditTotal(
  lines: Array<{ credit: string }>
): number {
  return lines.reduce((sum, line) => sum + parsePettyCashVoucherAmount(line.credit), 0)
}

export function computePettyCashVoucherLineTotals(
  lines: Array<{ debit: string; credit: string }>
): { debit: number; credit: number; difference: number; balanced: boolean } {
  const debit = computePettyCashVoucherDebitTotal(lines)
  const credit = computePettyCashVoucherCreditTotal(lines)
  const difference = debit - credit
  return {
    debit,
    credit,
    difference,
    balanced: Math.abs(difference) < 0.0001,
  }
}

export function computePettyCashAccountLineTotals(
  lines: Array<{ accountCode: string; debit: string; credit: string }>,
  pettyCashAccountCode: string
): { debit: number; credit: number } {
  const code = pettyCashAccountCode.trim()
  let debit = 0
  let credit = 0
  for (const line of lines) {
    if (line.accountCode.trim() !== code) continue
    debit += parsePettyCashVoucherAmount(line.debit)
    credit += parsePettyCashVoucherAmount(line.credit)
  }
  return { debit, credit }
}
