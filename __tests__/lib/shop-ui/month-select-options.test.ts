import {
  COMPACT_MONTH_VALUES,
  formatCompactMonthOptionLabel,
  formatPaddedMonth,
} from "@/lib/shop-ui/month-select-options"

describe("month-select-options", () => {
  it("formats padded month numbers", () => {
    expect(formatPaddedMonth(5)).toBe("05")
    expect(formatPaddedMonth(12)).toBe("12")
  })

  it("formats dropdown labels with abbreviation", () => {
    expect(formatCompactMonthOptionLabel(5)).toBe("05 • MAY")
    expect(formatCompactMonthOptionLabel(6)).toBe("06 • JUN")
    expect(formatCompactMonthOptionLabel(7)).toBe("07 • JUL")
  })

  it("lists all twelve numeric month values", () => {
    expect(COMPACT_MONTH_VALUES).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ])
  })
})
