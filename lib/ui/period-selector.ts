/**
 * ASA-CON PeriodSelector helpers — shared Year/Month → periodKey (YYYY-MM).
 *
 * PeriodSelector is the ASA-CON standard period control: separate Year and Month
 * dropdowns. Year contains current year - 2 through current year + 7 (10 years).
 * Month uses the shared 01 • JAN through 12 • DEC options. The control produces
 * periodKey in YYYY-MM format.
 */
import { bangkokCalendarParts } from "@/lib/reporting/bangkok-calendar"
import {
  COMPACT_MONTH_VALUES,
  formatCompactMonthOptionLabel,
  formatPaddedMonth,
} from "@/lib/shop-ui/month-select-options"

export const PERIOD_SELECTOR_YEAR_COUNT = 10
export const PERIOD_SELECTOR_YEAR_PAST = 2
export const PERIOD_SELECTOR_YEAR_FUTURE = 7

/** Build canonical periodKey YYYY-MM from year + month (1–12). */
export function buildPeriodKeyFromYearMonth(year: number, month: number): string {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid year/month for periodKey: ${year}-${month}`)
  }
  return `${year}-${formatPaddedMonth(month)}`
}

/** Parse YYYY-MM into year/month parts; null if invalid. */
export function parsePeriodKeyYearMonth(
  periodKey: string
): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(String(periodKey ?? "").trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null
  }
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null
  return { year, month }
}

/**
 * Year options: current year - 2 through current year + 7 (10 years inclusive).
 * Uses Asia/Bangkok calendar year when `now` is a real clock date.
 */
export function periodSelectorYearOptions(now: Date = new Date()): number[] {
  const current = bangkokCalendarParts(now).y
  const start = current - PERIOD_SELECTOR_YEAR_PAST
  return Array.from({ length: PERIOD_SELECTOR_YEAR_COUNT }, (_, index) => start + index)
}

/** Default period = current Bangkok calendar year/month. */
export function defaultPeriodSelectorParts(now: Date = new Date()): {
  year: number
  month: number
  periodKey: string
} {
  const { y: year, m: month } = bangkokCalendarParts(now)
  return {
    year,
    month,
    periodKey: buildPeriodKeyFromYearMonth(year, month),
  }
}

/**
 * Resolve display parts from an optional periodKey.
 * Invalid or out-of-range years fall back to the standard default (does not
 * silently keep unsupported years in the Year dropdown).
 */
export function resolvePeriodSelectorParts(
  periodKey: string | null | undefined,
  now: Date = new Date()
): { year: number; month: number; periodKey: string } {
  const parsed = periodKey ? parsePeriodKeyYearMonth(periodKey) : null
  const years = periodSelectorYearOptions(now)
  if (parsed && years.includes(parsed.year)) {
    return {
      year: parsed.year,
      month: parsed.month,
      periodKey: buildPeriodKeyFromYearMonth(parsed.year, parsed.month),
    }
  }
  return defaultPeriodSelectorParts(now)
}

export function isValidPeriodKey(periodKey: string): boolean {
  return parsePeriodKeyYearMonth(periodKey) != null
}

export {
  COMPACT_MONTH_VALUES as PERIOD_SELECTOR_MONTH_VALUES,
  formatCompactMonthOptionLabel,
  formatPaddedMonth,
}
