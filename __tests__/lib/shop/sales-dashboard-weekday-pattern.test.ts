import { Prisma } from "@/generated/prisma/client"
import {
  computePreviousMonthWeekdayPatterns,
  formatWeekdayPatternValue,
  grossByDateKeyFromDayRows,
} from "@/lib/shop/sales-dashboard-weekday-pattern"
import { monthDayKeys } from "@/lib/reporting/bangkok-calendar"
import { bangkokWeekdaySun0 } from "@/lib/shop-ui/sales-target-calendar"
import { toDec, ZERO } from "@/lib/stock/decimal"

describe("computePreviousMonthWeekdayPatterns", () => {
  it("returns weekday multipliers rounded to 2 decimals", () => {
    const grossByDateKey = new Map<string, Prisma.Decimal>([
      ["2026-05-01", toDec("60.00")],
    ])

    const patterns = computePreviousMonthWeekdayPatterns({
      year: 2026,
      month: 5,
      grossByDateKey,
    })

    const fridayIndex = bangkokWeekdaySun0(2026, 5, 1)
    expect(fridayIndex).toBe(5)
    expect(patterns[fridayIndex]).toBe("6.20")
    expect(patterns[0]).toBe("0.00")
    expect(formatWeekdayPatternValue(toDec("1.523"))).toBe("1.52")
  })

  it("returns null patterns when previous month has no sales", () => {
    const dayKeys = monthDayKeys(2026, 5)
    const grossByDateKey = new Map<string, Prisma.Decimal>(
      dayKeys.map((dateKey) => [dateKey, ZERO])
    )

    const patterns = computePreviousMonthWeekdayPatterns({
      year: 2026,
      month: 5,
      grossByDateKey,
    })

    expect(patterns).toHaveLength(7)
    expect(patterns.every((value) => value === null)).toBe(true)
  })

  it("uses previous month calendar days for average daily sales", () => {
    const grossByDateKey = grossByDateKeyFromDayRows([
      { dateKey: "2026-04-03", grossSales: "310.00" },
    ])

    const patterns = computePreviousMonthWeekdayPatterns({
      year: 2026,
      month: 4,
      grossByDateKey,
    })

    const fridayIndex = bangkokWeekdaySun0(2026, 4, 3)
    expect(patterns[fridayIndex]).toBe("7.50")
  })
})

describe("grossByDateKeyFromDayRows", () => {
  it("aggregates duplicate date keys from multiple branches", () => {
    const map = grossByDateKeyFromDayRows([
      { dateKey: "2026-05-01", grossSales: "40.00" },
      { dateKey: "2026-05-01", grossSales: "20.00" },
    ])

    expect(map.get("2026-05-01")?.toFixed(2)).toBe("60.00")
  })
})
