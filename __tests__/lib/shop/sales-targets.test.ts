import {
  parseWeekPattern,
  splitMonthlyTargetToDaily,
} from "@/lib/shop/sales-targets"

describe("parseWeekPattern", () => {
  it("returns default when invalid", () => {
    expect(parseWeekPattern(null)).toEqual([1, 1, 1, 1, 1, 1, 1])
    expect(parseWeekPattern([0, 0, 0, 0, 0, 0, 0])).toEqual([1, 1, 1, 1, 1, 1, 1])
  })

  it("preserves valid pattern", () => {
    expect(parseWeekPattern([2, 1, 1, 1, 1, 1, 2])).toEqual([2, 1, 1, 1, 1, 1, 2])
  })

  it("preserves decimal weights", () => {
    expect(parseWeekPattern([0.8, 0.9, 1.0, 1.1, 1.0, 0.9, 0.8])).toEqual([
      0.8, 0.9, 1.0, 1.1, 1.0, 0.9, 0.8,
    ])
  })
})

describe("splitMonthlyTargetToDaily", () => {
  it("splits equal weights evenly with drift on last day", () => {
    const days = splitMonthlyTargetToDaily({
      monthlyTotal: "3000",
      weekPattern: [1, 1, 1, 1, 1, 1, 1],
      year: 2026,
      month: 6,
    })
    expect(days).toHaveLength(30)
    const sum = days.reduce((acc, d) => acc + Number(d.target), 0)
    expect(sum).toBeCloseTo(3000, 2)
  })

  it("returns zero targets for zero monthly total", () => {
    const days = splitMonthlyTargetToDaily({
      monthlyTotal: "0",
      weekPattern: [1, 1, 1, 1, 1, 1, 1],
      year: 2026,
      month: 6,
    })
    expect(days.every((d) => d.target === "0.00")).toBe(true)
  })

  it("assigns higher targets to heavier weekdays", () => {
    const days = splitMonthlyTargetToDaily({
      monthlyTotal: "1000",
      weekPattern: [2, 1, 1, 1, 1, 1, 1],
      year: 2026,
      month: 6,
    })
    const mondays = days.filter((d) => d.weekday === "Mon")
    const tuesdays = days.filter((d) => d.weekday === "Tue")
    const monAvg =
      mondays.reduce((a, d) => a + Number(d.target), 0) / mondays.length
    const tueAvg =
      tuesdays.reduce((a, d) => a + Number(d.target), 0) / tuesdays.length
    expect(monAvg).toBeGreaterThan(tueAvg)
  })

  it("accepts decimal weekPattern weights", () => {
    const decimalPattern = [0.8, 0.9, 1.0, 1.1, 1.0, 0.9, 0.8]
    const days = splitMonthlyTargetToDaily({
      monthlyTotal: "3100",
      weekPattern: decimalPattern,
      year: 2026,
      month: 6,
    })
    expect(days).toHaveLength(30)
    const sum = days.reduce((acc, d) => acc + Number(d.target), 0)
    expect(sum).toBeCloseTo(3100, 2)
  })
})
