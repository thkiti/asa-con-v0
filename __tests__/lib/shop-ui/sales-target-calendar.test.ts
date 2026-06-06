import { bangkokWeekdayMon0 } from "@/lib/reporting/bangkok-calendar"
import { splitMonthlyTargetToDaily } from "@/lib/shop/sales-targets"
import {
  bangkokWeekdaySun0,
  buildSalesTargetCalendarGrid,
  countSalesTargetCalendarDays,
  formatDailyTargetAmount,
  formatWeekPatternSummary,
  SALES_TARGET_WEEKDAY_HEADERS,
  weekPatternBackendIndex,
  WEEK_PATTERN_UI_TO_BACKEND,
} from "@/lib/shop-ui/sales-target-calendar"

describe("week pattern UI mapping", () => {
  it("maps Sun-first UI columns to Mon-first backend indices", () => {
    expect(WEEK_PATTERN_UI_TO_BACKEND).toEqual([6, 0, 1, 2, 3, 4, 5])
    expect(weekPatternBackendIndex(0)).toBe(6)
    expect(weekPatternBackendIndex(1)).toBe(0)
    expect(weekPatternBackendIndex(6)).toBe(5)
  })
})

describe("buildSalesTargetCalendarGrid", () => {
  const june2026Days = splitMonthlyTargetToDaily({
    monthlyTotal: "270000",
    weekPattern: [1, 1, 1, 1, 1, 1, 1],
    year: 2026,
    month: 6,
  })

  it("uses Sun–Sat weekday headers", () => {
    expect(SALES_TARGET_WEEKDAY_HEADERS).toEqual([
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ])
  })

  it("renders correct number of month days", () => {
    const cells = buildSalesTargetCalendarGrid({
      year: 2026,
      month: 6,
      days: june2026Days,
    })
    expect(countSalesTargetCalendarDays(cells)).toBe(30)
  })

  it("places first day under correct Sunday-based weekday column", () => {
    expect(bangkokWeekdayMon0(2026, 6, 1)).toBe(0)
    expect(bangkokWeekdaySun0(2026, 6, 1)).toBe(1)
    const cells = buildSalesTargetCalendarGrid({
      year: 2026,
      month: 6,
      days: june2026Days,
    })
    const firstDayIndex = cells.findIndex((c) => c.kind === "day")
    expect(firstDayIndex).toBe(1)
    const first = cells[firstDayIndex]
    expect(first.kind).toBe("day")
    if (first.kind === "day") {
      expect(first.day).toBe(1)
    }
  })

  it("pads leading Sunday column when month starts after Sunday", () => {
    expect(bangkokWeekdayMon0(2026, 5, 1)).toBe(4)
    expect(bangkokWeekdaySun0(2026, 5, 1)).toBe(5)
    const mayDays = splitMonthlyTargetToDaily({
      monthlyTotal: "1000",
      weekPattern: [1, 1, 1, 1, 1, 1, 1],
      year: 2026,
      month: 5,
    })
    const cells = buildSalesTargetCalendarGrid({
      year: 2026,
      month: 5,
      days: mayDays,
    })
    expect(cells.slice(0, 5).every((c) => c.kind === "empty")).toBe(true)
    expect(cells[5]?.kind).toBe("day")
    if (cells[5]?.kind === "day") {
      expect(cells[5].day).toBe(1)
    }
  })

  it("grid length is a multiple of 7", () => {
    const cells = buildSalesTargetCalendarGrid({
      year: 2026,
      month: 6,
      days: june2026Days,
    })
    expect(cells.length % 7).toBe(0)
  })
})

describe("formatDailyTargetAmount", () => {
  it("formats amounts with thousand separators", () => {
    expect(formatDailyTargetAmount("9230.77")).toBe("9,230.77")
    expect(formatDailyTargetAmount("11538.46")).toBe("11,538.46")
    expect(formatDailyTargetAmount("12500.00")).toBe("12,500")
  })

  it("shows em dash for zero or missing targets", () => {
    expect(formatDailyTargetAmount("0")).toBe("—")
    expect(formatDailyTargetAmount("0.00")).toBe("—")
    expect(formatDailyTargetAmount(null)).toBe("—")
    expect(formatDailyTargetAmount(undefined)).toBe("—")
    expect(formatDailyTargetAmount("")).toBe("—")
  })
})

describe("formatWeekPatternSummary", () => {
  it("displays weights Sun–Sat with max-1-decimal sum", () => {
    // backend: Mon=0.8, Tue=0.9, Wed=1, Thu=1.1, Fri=1.2, Sat=1.5, Sun=1.5
    expect(formatWeekPatternSummary([0.8, 0.9, 1, 1.1, 1.2, 1.5, 1.5])).toBe(
      "Week pattern (Sun–Sat): 1.5, 0.8, 0.9, 1, 1.1, 1.2, 1.5 · Sum: 8"
    )
  })
})
