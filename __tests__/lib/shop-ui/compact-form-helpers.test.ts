import {
  compactHeaderFieldClass,
  compactHeaderRowGridClass,
  formatDashboardBillCount,
  formatDashboardCalendarMoneyAmount,
  formatDashboardMoneyAmount,
  formatDashboardSummaryAmount,
  formatFinancialCellValue,
  formatFinancialNumber,
  handleEnterFocusNext,
  handleEnterFocusNextInSequence,
  isAllowedDecimalDraft,
  isAllowedFinancialDraft,
  isIncompleteDecimalDraft,
  parseFinancialInput,
  selectAllOnFocus,
  SUNDAY_FIRST_WEEKDAY_HEADERS,
} from "@/lib/shop-ui/compact-form-helpers"

describe("compactHeaderFieldClass", () => {
  it("uses shared fixed height for top-row controls", () => {
    expect(compactHeaderFieldClass).toContain("h-9")
    expect(compactHeaderFieldClass).toContain("text-sm")
  })
})

describe("compactHeaderRowGridClass", () => {
  it("keeps Branch Year Month Target on one desktop row", () => {
    expect(compactHeaderRowGridClass).toContain(
      "sm:grid-cols-[minmax(0,1fr)_4.25rem_3rem_minmax(10rem,14rem)]"
    )
  })
})

describe("decimal and financial drafts", () => {
  it("allows in-progress decimal strings", () => {
    expect(isAllowedDecimalDraft("0.")).toBe(true)
    expect(isAllowedDecimalDraft("0.8")).toBe(true)
    expect(isAllowedDecimalDraft("1.2")).toBe(true)
    expect(isIncompleteDecimalDraft("0.")).toBe(true)
  })

  it("parses and formats financial values", () => {
    expect(isAllowedFinancialDraft("270,000")).toBe(true)
    expect(parseFinancialInput("270,000")).toBe("270000")
    expect(formatFinancialNumber(270000)).toBe("270,000")
  })

  it("formats calendar cell values", () => {
    expect(formatFinancialCellValue("9230.77")).toBe("9,230.77")
    expect(formatFinancialCellValue("0")).toBe("—")
  })
})

describe("formatDashboardMoneyAmount", () => {
  it("always shows exactly two decimal places with grouping", () => {
    expect(formatDashboardMoneyAmount(0)).toBe("0.00")
    expect(formatDashboardMoneyAmount("0")).toBe("0.00")
    expect(formatDashboardMoneyAmount("34715")).toBe("34,715.00")
    expect(formatDashboardMoneyAmount("34715.00")).toBe("34,715.00")
    expect(formatDashboardMoneyAmount("2271.04")).toBe("2,271.04")
    expect(formatDashboardMoneyAmount("1461796")).toBe("1,461,796.00")
  })

  it("powers summary money formatter and leaves bill count integer", () => {
    expect(formatDashboardSummaryAmount("34715")).toBe("34,715.00")
    expect(formatDashboardSummaryAmount("0.00")).toBe("0.00")
    expect(formatDashboardBillCount(2244)).toBe("2,244")
  })

  it("formats calendar money with dash only when value is missing", () => {
    expect(formatDashboardCalendarMoneyAmount(null)).toBe("-")
    expect(formatDashboardCalendarMoneyAmount(undefined)).toBe("-")
    expect(formatDashboardCalendarMoneyAmount("0.00")).toBe("0.00")
    expect(formatDashboardCalendarMoneyAmount("150.00")).toBe("150.00")
    expect(formatDashboardCalendarMoneyAmount("9.81")).toBe("9.81")
  })
})

describe("enter focus navigation", () => {
  it("handleEnterFocusNext focuses next ref on Enter", () => {
    const next = { focus: jest.fn() } as unknown as HTMLInputElement
    const preventDefault = jest.fn()
    handleEnterFocusNext({ key: "Enter", preventDefault }, next)
    expect(preventDefault).toHaveBeenCalled()
    expect(next.focus).toHaveBeenCalled()
  })

  it("handleEnterFocusNextInSequence moves through a field list", () => {
    const second = { focus: jest.fn() } as unknown as HTMLInputElement
    const preventDefault = jest.fn()
    handleEnterFocusNextInSequence(
      { key: "Enter", preventDefault },
      0,
      [null, second],
      null
    )
    expect(second.focus).toHaveBeenCalled()
  })
})

describe("selectAllOnFocus", () => {
  it("selects entire input value Excel-style", () => {
    const input = { select: jest.fn() } as unknown as HTMLInputElement
    selectAllOnFocus({ currentTarget: input })
    expect(input.select).toHaveBeenCalled()
  })
})

describe("SUNDAY_FIRST_WEEKDAY_HEADERS", () => {
  it("starts with Sun", () => {
    expect(SUNDAY_FIRST_WEEKDAY_HEADERS[0]).toBe("Sun")
    expect(SUNDAY_FIRST_WEEKDAY_HEADERS[6]).toBe("Sat")
  })
})
