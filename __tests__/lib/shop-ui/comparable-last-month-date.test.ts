import {
  getCalendarGridPosition,
  getComparableLastMonthDate,
  getComparableLastMonthDateFromDateKey,
  getDateAtCalendarGridPosition,
} from "@/lib/shop-ui/comparable-last-month-date"
import { bangkokWeekdaySun0 } from "@/lib/shop-ui/sales-target-calendar"

describe("getComparableLastMonthDate", () => {
  it("maps May 1 2026 (Friday) to April 3 in the same grid position", () => {
    expect(bangkokWeekdaySun0(2026, 5, 1)).toBe(5)
    expect(getComparableLastMonthDate({ year: 2026, month: 5, day: 1 })).toBe(
      "2026-04-03"
    )
    expect(bangkokWeekdaySun0(2026, 4, 3)).toBe(5)
  })

  it("handles months that start on a different weekday", () => {
    expect(getComparableLastMonthDate({ year: 2026, month: 6, day: 1 })).toBeNull()
    expect(getComparableLastMonthDate({ year: 2026, month: 6, day: 7 })).toBe(
      "2026-05-03"
    )
  })

  it("returns null when the comparable previous-month cell is outside that month", () => {
    expect(getComparableLastMonthDate({ year: 2026, month: 5, day: 31 })).toBeNull()
    const position = getCalendarGridPosition(2026, 5, 31)
    expect(getDateAtCalendarGridPosition(2026, 4, position)).toBeNull()
  })

  it("handles February leap year when the comparable cell exists", () => {
    expect(getComparableLastMonthDate({ year: 2024, month: 3, day: 1 })).toBe(
      "2024-02-02"
    )
    expect(getComparableLastMonthDateFromDateKey("2024-03-01")).toBe("2024-02-02")
  })

  it("returns null for January when the comparable cell is outside that month", () => {
    expect(getComparableLastMonthDate({ year: 2026, month: 6, day: 1 })).toBeNull()
  })
})
