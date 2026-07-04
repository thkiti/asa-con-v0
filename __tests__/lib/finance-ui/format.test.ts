import {
  formatAmount,
  formatBankCashCheckDayMonth,
  formatJournalLineSideAmount,
  formatVarianceLabel,
  getVarianceTone,
} from "@/lib/finance-ui/format"

describe("formatAmount", () => {
  it("formats numeric strings with two decimals", () => {
    expect(formatAmount("1000")).toMatch(/1,000\.00|1000\.00/)
    expect(formatAmount("995.5")).toMatch(/995\.50/)
  })

  it("returns original value when not numeric", () => {
    expect(formatAmount("n/a")).toBe("n/a")
  })
})

describe("formatJournalLineSideAmount", () => {
  it("returns blank for zero amounts", () => {
    expect(formatJournalLineSideAmount("0")).toBe("")
    expect(formatJournalLineSideAmount("0.00")).toBe("")
    expect(formatJournalLineSideAmount("")).toBe("")
  })

  it("formats non-zero amounts like formatAmount", () => {
    expect(formatJournalLineSideAmount("1000")).toMatch(/1,000\.00|1000\.00/)
    expect(formatJournalLineSideAmount("2000")).toMatch(/2,000\.00|2000\.00/)
  })
})

describe("getVarianceTone", () => {
  it("returns zero for zero variance", () => {
    expect(getVarianceTone("0")).toBe("zero")
    expect(getVarianceTone("0.00")).toBe("zero")
  })

  it("returns positive for positive variance", () => {
    expect(getVarianceTone("5")).toBe("positive")
    expect(getVarianceTone("0.01")).toBe("positive")
  })

  it("returns negative for negative variance", () => {
    expect(getVarianceTone("-5")).toBe("negative")
    expect(getVarianceTone("-0.01")).toBe("negative")
  })
})

describe("formatVarianceLabel", () => {
  it("formats signed variance labels", () => {
    expect(formatVarianceLabel("0")).toMatch(/0\.00/)
    expect(formatVarianceLabel("5")).toMatch(/^\+/)
    expect(formatVarianceLabel("-5")).toMatch(/^-/)
  })
})

describe("formatBankCashCheckDayMonth", () => {
  it("formats ISO dates as DD.MM without year", () => {
    expect(formatBankCashCheckDayMonth("2026-01-05")).toBe("05.01")
    expect(formatBankCashCheckDayMonth("2026-01-15T00:00:00.000Z")).toBe("15.01")
    expect(formatBankCashCheckDayMonth("2026-01-30")).toBe("30.01")
  })

  it("returns em dash for empty values", () => {
    expect(formatBankCashCheckDayMonth(null)).toBe("—")
  })
})
