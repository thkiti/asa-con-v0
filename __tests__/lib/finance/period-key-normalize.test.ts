import {
  normalizeAccountingPeriodKey,
  periodKeyToDateRange,
} from "@/lib/finance/period-key"

describe("normalizeAccountingPeriodKey", () => {
  it.each([
    ["202601", "2026-01"],
    ["2026-01", "2026-01"],
    ["2026/01", "2026-01"],
    ["2026 01", "2026-01"],
    ["2026-1", "2026-01"],
    [" 202601 ", "2026-01"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeAccountingPeriodKey(input)).toBe(expected)
  })

  it("rejects invalid months", () => {
    expect(normalizeAccountingPeriodKey("202613")).toBeNull()
    expect(normalizeAccountingPeriodKey("202600")).toBeNull()
  })

  it("returns null for empty or partial input", () => {
    expect(normalizeAccountingPeriodKey("")).toBeNull()
    expect(normalizeAccountingPeriodKey("2026")).toBeNull()
    expect(normalizeAccountingPeriodKey("20260")).toBeNull()
  })
})

describe("periodKeyToDateRange with flexible input", () => {
  it("accepts compact period keys", () => {
    expect(periodKeyToDateRange("202601")).toEqual({
      from: "2026-01-01",
      to: "2026-01-31",
    })
  })
})
