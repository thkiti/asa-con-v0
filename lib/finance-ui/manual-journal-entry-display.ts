export type ManualJournalEntryTypeCode =
  | "MANUAL"
  | "OPENING_BALANCE"
  | "ADJUSTMENT"
  | "RECLASS"
  | "ACCRUAL"
  | "AUDITOR_ADJUSTMENT"

export type ManualJournalEntryStatusCode =
  | "DRAFT"
  | "SUBMITTED"
  | "CONFIRMED"
  | "POSTED"
  | "CANCELLED"

/** Document type codes — legal entity is never part of the number string. */
export const MANUAL_JOURNAL_ENTRY_TYPE_CODE: Record<ManualJournalEntryTypeCode, string> = {
  MANUAL: "MJV",
  OPENING_BALANCE: "OPB",
  ADJUSTMENT: "ADJ",
  RECLASS: "REJ",
  ACCRUAL: "ACJ",
  AUDITOR_ADJUSTMENT: "AUJ",
}

export const MANUAL_JOURNAL_ENTRY_TYPES: ManualJournalEntryTypeCode[] = [
  "MANUAL",
  "OPENING_BALANCE",
  "ADJUSTMENT",
  "RECLASS",
  "ACCRUAL",
  "AUDITOR_ADJUSTMENT",
]

export const MANUAL_JOURNAL_ENTRY_STATUSES: ManualJournalEntryStatusCode[] = [
  "DRAFT",
  "SUBMITTED",
  "CONFIRMED",
  "POSTED",
  "CANCELLED",
]

export function manualJournalEntryTypeCode(
  entryType: ManualJournalEntryTypeCode | string
): string {
  const key = entryType as ManualJournalEntryTypeCode
  return MANUAL_JOURNAL_ENTRY_TYPE_CODE[key] ?? String(entryType)
}

export function formatManualJournalEntryTypeLabel(
  entryType: ManualJournalEntryTypeCode | string
): string {
  const code = manualJournalEntryTypeCode(entryType)
  switch (entryType) {
    case "MANUAL":
      return `${code} — Manual Journal Voucher`
    case "OPENING_BALANCE":
      return `${code} — Opening balance`
    case "ADJUSTMENT":
      return `${code} — Adjustment`
    case "RECLASS":
      return `${code} — Reclass`
    case "ACCRUAL":
      return `${code} — Accrual`
    case "AUDITOR_ADJUSTMENT":
      return `${code} — Auditor adjustment`
    default:
      return code
  }
}

export function formatManualJournalEntryStatusLabel(
  status: ManualJournalEntryStatusCode | string
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

/** Display stored entry number only — never prefix ASAS/ASAD. */
export function formatManualJournalEntryDocumentNo(
  entryNo: string | null | undefined,
  entryType?: ManualJournalEntryTypeCode | string
): string {
  if (entryNo?.trim()) return entryNo.trim()
  if (entryType) return `${manualJournalEntryTypeCode(entryType)} (draft)`
  return "Draft"
}

export function parseManualJournalAmount(value: string): number {
  const n = Number(String(value ?? "").trim() || "0")
  return Number.isFinite(n) ? n : 0
}

export function computeManualJournalLineTotals(
  lines: Array<{ debit: string; credit: string }>
): { debit: number; credit: number; difference: number; balanced: boolean } {
  let debit = 0
  let credit = 0
  for (const line of lines) {
    debit += parseManualJournalAmount(line.debit)
    credit += parseManualJournalAmount(line.credit)
  }
  const difference = debit - credit
  return {
    debit,
    credit,
    difference,
    balanced: Math.abs(difference) < 0.0001,
  }
}
