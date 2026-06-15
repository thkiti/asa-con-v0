import type { Prisma } from "@/generated/prisma/client"
import { daysInCalendarMonth, monthDayKeys } from "@/lib/reporting/bangkok-calendar"
import { ZERO } from "@/lib/stock/decimal"

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

/** Same month/day in the previous calendar year (clamp day for shorter months). */
export function toComparablePreviousYearDateKey(dateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey).trim())
  if (!match) {
    throw new Error("dateKey must be YYYY-MM-DD")
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const prevYear = year - 1
  const maxDay = daysInCalendarMonth(prevYear, month)
  const clampedDay = Math.min(day, maxDay)
  return `${prevYear}-${pad2(month)}-${pad2(clampedDay)}`
}

/** Cumulative gross from Jan 1 through each day up to throughMonth (inclusive). */
export function buildYtdCumulativeGrossMap(
  year: number,
  throughMonth: number,
  grossByDateKey: ReadonlyMap<string, Prisma.Decimal>
): Map<string, Prisma.Decimal> {
  const result = new Map<string, Prisma.Decimal>()
  let running = ZERO
  for (let month = 1; month <= throughMonth; month++) {
    for (const key of monthDayKeys(year, month)) {
      running = running.plus(grossByDateKey.get(key) ?? ZERO)
      result.set(key, running)
    }
  }
  return result
}

export function mergeGrossByDateKey(
  target: Map<string, Prisma.Decimal>,
  source: ReadonlyMap<string, Prisma.Decimal>
): void {
  for (const [key, amount] of source) {
    target.set(key, (target.get(key) ?? ZERO).plus(amount))
  }
}

/** YTD gross total through the last day of the selected month. */
export function ytdGrossThroughMonth(
  year: number,
  month: number,
  cumulativeByDateKey: ReadonlyMap<string, Prisma.Decimal>
): Prisma.Decimal {
  const dayKeys = monthDayKeys(year, month)
  const lastKey = dayKeys[dayKeys.length - 1]
  if (!lastKey) return ZERO
  return cumulativeByDateKey.get(lastKey) ?? ZERO
}
