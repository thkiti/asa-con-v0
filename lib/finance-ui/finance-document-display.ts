import { formatEntityShort } from "@/lib/legal-entity/display"
import type {
  ManualJournalEntryStatusCode,
  ManualJournalEntryTypeCode,
} from "@/lib/finance-ui/manual-journal-entry-display"

const FINANCE_DOCUMENT_AUDIT_SEP = " • "

/** Canonical Row 1 document type titles (FINANCE_DOCUMENT_IDENTITY_STANDARD §5). */
export const FINANCE_DOCUMENT_TYPE_TITLE: Record<ManualJournalEntryTypeCode, string> = {
  MANUAL: "MANUAL JOURNAL VOUCHER",
  OPENING_BALANCE: "OPENING BALANCE",
  ADJUSTMENT: "ADJUSTMENT JOURNAL",
  RECLASS: "RECLASS JOURNAL",
  ACCRUAL: "ACCRUAL JOURNAL",
  AUDITOR_ADJUSTMENT: "AUDITOR ADJUSTMENT JOURNAL",
}

/** Date-only display for finance documents (DD.MM.YYYY). */
export function formatFinanceDocumentDate(value: string | null | undefined): string {
  if (!value?.trim()) return "—"
  const isoDate = value.trim().slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (match) {
    return `${match[3]}.${match[2]}.${match[1]}`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

export type FinanceDocumentAuditLineInput = {
  documentNo: string
  entryDate: string
  createdAt: string
  submittedAt?: string | null
  confirmedAt?: string | null
  postedAt?: string | null
  cancelledAt?: string | null
}

/** Single-line audit summary for confirmed finance documents. */
export function buildFinanceDocumentAuditLine(input: FinanceDocumentAuditLineInput): string {
  const segments = [
    input.documentNo,
    `Entry Date: ${formatFinanceDocumentDate(input.entryDate)}`,
    `Created: ${formatFinanceDocumentDate(input.createdAt)}`,
  ]

  if (input.submittedAt) {
    segments.push(`Submitted: ${formatFinanceDocumentDate(input.submittedAt)}`)
  }
  if (input.confirmedAt) {
    segments.push(`Confirmed: ${formatFinanceDocumentDate(input.confirmedAt)}`)
  }
  if (input.postedAt) {
    segments.push(`Posted: ${formatFinanceDocumentDate(input.postedAt)}`)
  }
  if (input.cancelledAt) {
    segments.push(`Cancelled: ${formatFinanceDocumentDate(input.cancelledAt)}`)
  }

  return segments.join(FINANCE_DOCUMENT_AUDIT_SEP)
}

export function formatFinanceDocumentPeriodKey(
  entryDate: string | null | undefined
): string {
  const isoDate = String(entryDate ?? "").trim().slice(0, 10)
  if (isoDate.length >= 7) return isoDate.slice(0, 7)
  return isoDate || "—"
}

export function formatFinanceDocumentTypeTitle(
  entryType: ManualJournalEntryTypeCode | string
): string {
  if (entryType === "PAV" || entryType === "PAYMENT_VOUCHER") {
    return "PAYMENT VOUCHER"
  }
  const key = entryType as ManualJournalEntryTypeCode
  return FINANCE_DOCUMENT_TYPE_TITLE[key] ?? String(entryType).toUpperCase()
}

export function buildFinanceDocumentIdentityRow1(
  legalEntityCode: string,
  entryType: ManualJournalEntryTypeCode | string
): string {
  return `${formatEntityShort(legalEntityCode)}${FINANCE_DOCUMENT_AUDIT_SEP}${formatFinanceDocumentTypeTitle(entryType)}`
}

export function buildFinanceDocumentIdentityRow2(input: {
  documentNo: string
  entryDate: string
  status: ManualJournalEntryStatusCode | string
}): string {
  return [
    input.documentNo,
    `Entry Date: ${formatFinanceDocumentDate(input.entryDate)}`,
    `Period: ${formatFinanceDocumentPeriodKey(input.entryDate)}`,
    `Status: ${String(input.status).toUpperCase()}`,
  ].join(FINANCE_DOCUMENT_AUDIT_SEP)
}

export type FinanceDocumentWorkflowAuditInput = {
  createdAt: string
  submittedAt?: string | null
  confirmedAt?: string | null
  postedAt?: string | null
  cancelledAt?: string | null
}

/** Supplementary workflow timestamps — not part of canonical Row 2. */
export function buildFinanceDocumentWorkflowAuditLine(
  input: FinanceDocumentWorkflowAuditInput
): string {
  const segments = [`Created: ${formatFinanceDocumentDate(input.createdAt)}`]

  if (input.submittedAt) {
    segments.push(`Submitted: ${formatFinanceDocumentDate(input.submittedAt)}`)
  }
  if (input.confirmedAt) {
    segments.push(`Confirmed: ${formatFinanceDocumentDate(input.confirmedAt)}`)
  }
  if (input.postedAt) {
    segments.push(`Posted: ${formatFinanceDocumentDate(input.postedAt)}`)
  }
  if (input.cancelledAt) {
    segments.push(`Cancelled: ${formatFinanceDocumentDate(input.cancelledAt)}`)
  }

  return segments.join(FINANCE_DOCUMENT_AUDIT_SEP)
}

export type FinanceDocumentHeaderContext = {
  legalEntityCode: string
  entryType: ManualJournalEntryTypeCode | string
  documentNo: string
  entryDate: string
  status: ManualJournalEntryStatusCode | string
  description: string
  createdAt: string
  submittedAt?: string | null
  confirmedAt?: string | null
  postedAt?: string | null
  cancelledAt?: string | null
}
