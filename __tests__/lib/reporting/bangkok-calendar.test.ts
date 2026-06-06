import {
  bangkokDateKey,
  bangkokMonthRange,
  monthDayKeys,
} from "@/lib/reporting/bangkok-calendar"

describe("bangkok-calendar", () => {
  it("formats Bangkok date keys", () => {
    expect(bangkokDateKey(new Date("2026-06-05T10:00:00+07:00"))).toBe("2026-06-05")
  })

  it("builds month day keys", () => {
    expect(monthDayKeys(2026, 6)).toHaveLength(30)
    expect(monthDayKeys(2026, 6)[0]).toBe("2026-06-01")
    expect(monthDayKeys(2026, 6)[29]).toBe("2026-06-30")
  })

  it("builds Bangkok month range", () => {
    const { start, end } = bangkokMonthRange(2026, 6)
    expect(start.toISOString()).toBe("2026-05-31T17:00:00.000Z")
    expect(end.toISOString()).toBe("2026-06-30T16:59:59.999Z")
  })
})
