import type { Prisma } from "@/generated/prisma/client"
import { monthDayKeys } from "@/lib/reporting/bangkok-calendar"
import { bangkokWeekdaySun0 } from "@/lib/shop-ui/sales-target-calendar"
import { toDec, ZERO } from "@/lib/stock/decimal"

const WEEKDAY_COUNT = 7

export function formatWeekdayPatternValue(value: Prisma.Decimal): string {
  return value.toFixed(2)
}

/**
 * Previous-month weekday sales multipliers (Sun=0 … Sat=6).
 * Uses calendar-day average: total sales / days in month.
 * Returns null per weekday when previous month has no sales.
 */
export function computePreviousMonthWeekdayPatterns(input: {
  year: number
  month: number
  grossByDateKey: ReadonlyMap<string, Prisma.Decimal>
}): ReadonlyArray<string | null> {
  const { year, month, grossByDateKey } = input
  const dayKeys = monthDayKeys(year, month)
  if (dayKeys.length === 0) {
    return Array<string | null>(WEEKDAY_COUNT).fill(null)
  }

  const salesByWeekday = Array.from({ length: WEEKDAY_COUNT }, () => ZERO)
  const weekdayCounts = Array(WEEKDAY_COUNT).fill(0)
  let totalSales = ZERO

  for (const dateKey of dayKeys) {
    const day = Number(dateKey.slice(8, 10))
    const weekdaySun0 = bangkokWeekdaySun0(year, month, day)
    const gross = grossByDateKey.get(dateKey) ?? ZERO
    totalSales = totalSales.plus(gross)
    salesByWeekday[weekdaySun0] = salesByWeekday[weekdaySun0].plus(gross)
    weekdayCounts[weekdaySun0] += 1
  }

  if (totalSales.isZero()) {
    return Array<string | null>(WEEKDAY_COUNT).fill(null)
  }

  const averageDailySales = totalSales.div(dayKeys.length)

  return salesByWeekday.map((weekdayTotal, weekdaySun0) => {
    const occurrences = weekdayCounts[weekdaySun0]
    if (occurrences === 0 || averageDailySales.isZero()) {
      return null
    }
    const weekdayAverageSales = weekdayTotal.div(occurrences)
    return formatWeekdayPatternValue(weekdayAverageSales.div(averageDailySales))
  })
}

export function grossByDateKeyFromDayRows(
  rows: ReadonlyArray<{ dateKey: string; grossSales: string }>
): Map<string, Prisma.Decimal> {
  const map = new Map<string, Prisma.Decimal>()
  for (const row of rows) {
    map.set(row.dateKey, (map.get(row.dateKey) ?? ZERO).plus(toDec(row.grossSales)))
  }
  return map
}
