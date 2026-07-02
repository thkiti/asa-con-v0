import { parseDocumentTracePeriodRange } from "@/lib/finance/audit/document-trace-filters"
import type { DocumentTraceFilters } from "@/lib/finance/audit/document-trace-filters"

export function documentTracePeriodToIsoRange(
  period: string
): { dateFrom: string; dateTo: string } | null {
  const range = parseDocumentTracePeriodRange(period)
  if (!range) return null

  const year = range.from.getFullYear()
  const month = range.from.getMonth() + 1
  const lastDay = range.to.getDate()

  return {
    dateFrom: `${year}-${String(month).padStart(2, "0")}-01`,
    dateTo: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  }
}

export function formatDocumentTraceDisplayDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!match) return iso.trim()

  return `${match[3]}/${match[2]}/${match[1]}`
}

export function parseDocumentTraceDisplayDate(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (isoMatch) return value

  const partsMatch = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(value)
  if (!partsMatch) return null

  const day = Number(partsMatch[1])
  const month = Number(partsMatch[2])
  const year = Number(partsMatch[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function resolveDocumentTraceDateDrafts(input: {
  period: string
  dateFrom: string
  dateTo: string
}): { dateFrom: string; dateTo: string } {
  const periodRange = documentTracePeriodToIsoRange(input.period)
  const fromDisplay = input.dateFrom.trim()
    ? formatDocumentTraceDisplayDate(input.dateFrom)
    : periodRange
      ? formatDocumentTraceDisplayDate(periodRange.dateFrom)
      : ""
  const toDisplay = input.dateTo.trim()
    ? formatDocumentTraceDisplayDate(input.dateTo)
    : periodRange
      ? formatDocumentTraceDisplayDate(periodRange.dateTo)
      : ""

  return { dateFrom: fromDisplay, dateTo: toDisplay }
}

export function buildDocumentTraceCommittedDatePatch(input: {
  period: string
  dateFromDisplay: string
  dateToDisplay: string
}): Pick<DocumentTraceFilters, "dateFrom" | "dateTo"> {
  const periodRange = documentTracePeriodToIsoRange(input.period)
  const fromIso = parseDocumentTraceDisplayDate(input.dateFromDisplay)
  const toIso = parseDocumentTraceDisplayDate(input.dateToDisplay)

  if (!periodRange) {
    return {
      dateFrom: fromIso ?? "",
      dateTo: toIso ?? "",
    }
  }

  return {
    dateFrom: fromIso && fromIso !== periodRange.dateFrom ? fromIso : "",
    dateTo: toIso && toIso !== periodRange.dateTo ? toIso : "",
  }
}
