import {
  bangkokWeekdayMon0,
  previousCalendarMonth,
} from "@/lib/reporting/bangkok-calendar"

describe("bangkokWeekdayMon0", () => {
  it("maps known Bangkok weekdays", () => {
    expect(bangkokWeekdayMon0(2026, 6, 1)).toBe(0)
    expect(bangkokWeekdayMon0(2026, 6, 7)).toBe(6)
  })
})

describe("previousCalendarMonth", () => {
  it("steps back within year", () => {
    expect(previousCalendarMonth(2026, 6)).toEqual({ year: 2026, month: 5 })
  })

  it("wraps January to December prior year", () => {
    expect(previousCalendarMonth(2026, 1)).toEqual({ year: 2025, month: 12 })
  })
})
