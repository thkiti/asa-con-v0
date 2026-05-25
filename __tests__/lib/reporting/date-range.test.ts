import { normalizeDateRange, normalizeDayRange } from "@/lib/reporting/date-range"
import { InvalidDateRangeError } from "@/lib/reporting/report-errors"

describe("reporting date-range", () => {
  it("normalizes a single UTC day", () => {
    const range = normalizeDayRange("2026-05-22")
    expect(range.start.toISOString()).toBe("2026-05-22T00:00:00.000Z")
    expect(range.endExclusive.toISOString()).toBe("2026-05-23T00:00:00.000Z")
  })

  it("normalizes inclusive from/to into [start, endExclusive)", () => {
    const range = normalizeDateRange({ from: "2026-05-01", to: "2026-05-03" })
    expect(range.start.toISOString()).toBe("2026-05-01T00:00:00.000Z")
    expect(range.endExclusive.toISOString()).toBe("2026-05-04T00:00:00.000Z")
  })

  it("rejects from after to", () => {
    expect(() =>
      normalizeDateRange({ from: "2026-05-10", to: "2026-05-01" })
    ).toThrow(InvalidDateRangeError)
  })
})
