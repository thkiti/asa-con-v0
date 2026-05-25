import {
  formatAmount,
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
