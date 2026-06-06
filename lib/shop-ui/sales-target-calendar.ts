import {
  bangkokWeekdayMon0,
  daysInCalendarMonth,
} from "@/lib/reporting/bangkok-calendar"
import type { DailyTargetSplit } from "@/lib/shop/sales-target-types"
import {
  formatFinancialCellValue,
  formatFinancialNumber,
} from "@/lib/shop-ui/compact-form-helpers"
import { formatPatternSum } from "@/lib/shop-ui/sales-target-form-helpers"

/** Calendar columns — Sunday first. */
export const SALES_TARGET_WEEKDAY_HEADERS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const

/** Week pattern input labels — same Sun-first order as calendar. */
export const WEEK_PATTERN_UI_LABELS = [...SALES_TARGET_WEEKDAY_HEADERS] as const

/**
 * UI column index (Sun=0 … Sat=6) → backend weekPattern index (Mon=0 … Sun=6).
 * Backend storage order is unchanged for split/save APIs.
 */
export const WEEK_PATTERN_UI_TO_BACKEND = [6, 0, 1, 2, 3, 4, 5] as const

export function weekPatternBackendIndex(uiIndex: number): number {
  return WEEK_PATTERN_UI_TO_BACKEND[uiIndex] ?? uiIndex
}

/** Sunday = 0 … Saturday = 6 (Bangkok calendar date). */
export function bangkokWeekdaySun0(
  y: number,
  month: number,
  day: number
): number {
  return (bangkokWeekdayMon0(y, month, day) + 1) % 7
}

export type SalesTargetCalendarDayCell = {
  kind: "day"
  day: number
  dateKey: string
  weekdaySun0: number
  target: string | null
}

export type SalesTargetCalendarCell =
  | { kind: "empty" }
  | SalesTargetCalendarDayCell

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

/** Build Sun–Sat calendar grid cells for a month (includes leading/trailing pads). */
export function buildSalesTargetCalendarGrid(input: {
  year: number
  month: number
  days: DailyTargetSplit[]
}): SalesTargetCalendarCell[] {
  const { year, month, days } = input
  const leadingPads = bangkokWeekdaySun0(year, month, 1)
  const dim = daysInCalendarMonth(year, month)
  const targetByDate = new Map(days.map((d) => [d.dateKey, d.target]))

  const cells: SalesTargetCalendarCell[] = []
  for (let i = 0; i < leadingPads; i++) {
    cells.push({ kind: "empty" })
  }
  for (let d = 1; d <= dim; d++) {
    const dateKey = `${year}-${pad2(month)}-${pad2(d)}`
    cells.push({
      kind: "day",
      day: d,
      dateKey,
      weekdaySun0: bangkokWeekdaySun0(year, month, d),
      target: targetByDate.get(dateKey) ?? null,
    })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ kind: "empty" })
  }
  return cells
}

export function countSalesTargetCalendarDays(
  cells: SalesTargetCalendarCell[]
): number {
  return cells.filter((c) => c.kind === "day").length
}

/** Daily target display — financial format or em dash when zero/missing. */
export function formatDailyTargetAmount(
  target: string | null | undefined
): string {
  return formatFinancialCellValue(target)
}

/** Footer summary — weights shown Sun→Sat; backend pattern remains Mon→Sun. */
export function formatWeekPatternSummary(pattern: number[]): string {
  const weights = WEEK_PATTERN_UI_TO_BACKEND.map((bi) =>
    formatPatternSum(pattern[bi] ?? 1)
  )
  const sum = formatPatternSum(
    pattern.reduce((acc, w) => acc + (Number.isFinite(w) && w >= 0 ? w : 0), 0)
  )
  return `Week pattern (Sun–Sat): ${weights.join(", ")} · Sum: ${sum}`
}
