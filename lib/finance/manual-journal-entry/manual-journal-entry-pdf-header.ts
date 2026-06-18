import type { ManualJournalEntryType } from "@/generated/prisma/client"
import { formatEntityShort } from "@/lib/legal-entity/display"
import type { ManualJournalEntryPdfSnapshot } from "./manual-journal-entry-pdf-snapshot-types"

const SEP = " • "

/** Compact audit header titles (max 3-row block). */
export const MANUAL_JOURNAL_PDF_HEADER_TITLE: Record<
  ManualJournalEntryType,
  string
> = {
  MANUAL: "MANUAL JOURNAL VOUCHER",
  OPENING_BALANCE: "OPENING BALANCE",
  ADJUSTMENT: "ADJUSTMENT JOURNAL",
  RECLASS: "RECLASS JOURNAL",
  ACCRUAL: "ACCRUAL JOURNAL",
  AUDITOR_ADJUSTMENT: "AUDITOR ADJUSTMENT JOURNAL",
}

const PDF_TIME_ZONE = "Asia/Bangkok"

export type ManualJournalPdfHeaderLines = {
  row1: string
  row2: string
  row3: string
  description: string | null
}

function formatPdfCalendarDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate ?? "").trim())
  if (!match) return isoDate
  return `${match[3]}/${match[2]}/${match[1]}`
}

function formatPdfPostedAt(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  if (Number.isNaN(date.getTime())) return isoDateTime

  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: PDF_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)

  return formatted.replace(",", "")
}

export function formatManualJournalPdfPeriodKey(entryDate: string): string {
  const trimmed = String(entryDate ?? "").trim()
  if (trimmed.length >= 7) return trimmed.slice(0, 7)
  return trimmed
}

export function buildManualJournalPdfHeaderLines(
  snapshot: Pick<
    ManualJournalEntryPdfSnapshot,
    | "entryType"
    | "legalEntityCode"
    | "entryNo"
    | "entryDate"
    | "postedAt"
    | "description"
  >
): ManualJournalPdfHeaderLines {
  const entity = formatEntityShort(snapshot.legalEntityCode)
  const title = MANUAL_JOURNAL_PDF_HEADER_TITLE[snapshot.entryType]
  const period = formatManualJournalPdfPeriodKey(snapshot.entryDate)

  return {
    row1: `${entity}${SEP}${title}`,
    row2: `Document No: ${snapshot.entryNo}${SEP}Period: ${period}${SEP}Status: POSTED`,
    row3: `Date: ${formatPdfCalendarDate(snapshot.entryDate)}${SEP}Posted: ${formatPdfPostedAt(snapshot.postedAt)}`,
    description: snapshot.description?.trim() ? snapshot.description.trim() : null,
  }
}
