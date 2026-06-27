import { addBangkokCalendarDays } from "@/lib/pos/bangkokDayBounds"
import {
  bangkokCalendarParts,
  daysInCalendarMonth,
} from "@/lib/reporting/bangkok-calendar"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

export type ReadZLookupMode = "daily" | "cumulative"

export type ReadZLookupDocType = "READ_Z"

export const READ_Z_LOOKUP_EMPTY_MESSAGE =
  "ไม่มีตั๋ว READ Z สำหรับวันที่ที่เลือก"

/** Bangkok calendar days from startYmd through endYmd, newest first. */
export function enumerateBangkokYmdRangeDesc(
  startYmd: string,
  endYmd: string
): string[] {
  const out: string[] = []
  let cursor = endYmd
  while (cursor >= startYmd) {
    out.push(cursor)
    if (cursor === startYmd) break
    cursor = addBangkokCalendarDays(cursor, -1)
  }
  return out
}

/** Month-to-date business dates for the lookup date dropdown. */
export function buildReadZLookupDropdownDates(anchorYmd: string): string[] {
  const monthStart = `${anchorYmd.slice(0, 7)}-01`
  return enumerateBangkokYmdRangeDesc(monthStart, anchorYmd)
}

export function buildReadZYmdFromParts(
  year: number,
  month: number,
  day: number
): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function parseReadZYmdParts(
  ymd: string
): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null
  return { year, month, day }
}

/** Valid day numbers for READ Z document lookup (1..month end, capped at today). */
export function buildDocumentLookupReadZDayOptions(
  year: number,
  month: number
): number[] {
  const today = bangkokCalendarParts(new Date())
  const lastDay = daysInCalendarMonth(year, month)
  const maxDay =
    year === today.y && month === today.m
      ? Math.min(lastDay, today.day)
      : lastDay
  if (maxDay < 1) return []
  return Array.from({ length: maxDay }, (_, index) => maxDay - index)
}

/** Bangkok YYYY-MM-DD options for Document Lookup date dropdown (newest first). */
export function buildDocumentLookupReadZDateOptions(
  year: number,
  month: number
): string[] {
  return buildDocumentLookupReadZDayOptions(year, month).map((day) =>
    buildReadZYmdFromParts(year, month, day)
  )
}

export function clampReadZDayForMonth(
  year: number,
  month: number,
  day: number
): number {
  const options = buildDocumentLookupReadZDayOptions(year, month)
  if (options.length === 0) return 1
  if (options.includes(day)) return day
  return options[0]!
}

/** Anchor YMD for year/month/day — always a valid option in that month. */
export function resolveDocumentLookupReadZSelectedDate(
  year: number,
  month: number,
  day: number
): string {
  return buildReadZYmdFromParts(year, month, clampReadZDayForMonth(year, month, day))
}

export function defaultDocumentLookupReadZSelectedDate(
  anchor: Date = new Date()
): string {
  const parts = bangkokCalendarParts(anchor)
  return resolveDocumentLookupReadZSelectedDate(parts.y, parts.m, parts.day)
}

/** One READ Z ticket per day — no sales/refunds means no ticket for that date. */
export function readZLookupDailyHasTicket(report: ReadReportPayload): boolean {
  if (report.readZScope !== "daily") return true
  return report.saleCount > 0 || report.refundCount > 0
}
