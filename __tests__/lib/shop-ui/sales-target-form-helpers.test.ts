import {
  draftsToWeightPattern,
  focusNextWeekPatternField,
  formatFinancialNumber,
  formatPatternSum,
  handleTargetEnterKey,
  handleWeekPatternEnterKey,
  isAllowedFinancialDraft,
  isAllowedWeightDraft,
  normalizeFinancialForApi,
  normalizeWeightDraft,
  parseFinancialInput,
  parseWeekPatternInput,
  salesTargetHeaderFieldClass,
  salesTargetNumericInputClass,
  selectAllOnFocus,
} from "@/lib/shop-ui/sales-target-form-helpers"
import { DEFAULT_WEEK_PATTERN } from "@/lib/shop/sales-target-types"

describe("salesTargetHeaderFieldClass", () => {
  it("uses shared fixed height for top-row controls", () => {
    expect(salesTargetHeaderFieldClass).toContain("h-9")
    expect(salesTargetHeaderFieldClass).toContain("text-sm")
  })
})

describe("salesTargetNumericInputClass", () => {
  it("includes spinner-hiding utilities", () => {
    expect(salesTargetNumericInputClass).toContain("appearance:textfield")
    expect(salesTargetNumericInputClass).toContain("webkit-outer-spin-button")
  })
})

describe("week pattern draft helpers", () => {
  it("allows in-progress decimal strings while typing", () => {
    expect(isAllowedWeightDraft("0.")).toBe(true)
    expect(isAllowedWeightDraft("1.")).toBe(true)
    expect(isAllowedWeightDraft("0.8")).toBe(true)
    expect(isAllowedWeightDraft("1.2")).toBe(true)
  })

  it("does not normalize incomplete drafts to numbers", () => {
    expect(normalizeWeightDraft("0.")).toBeNull()
    expect(normalizeWeightDraft("1.")).toBeNull()
    expect(normalizeWeightDraft("")).toBeNull()
  })

  it("normalizes complete decimal drafts", () => {
    expect(normalizeWeightDraft("0.8")).toBe(0.8)
    expect(normalizeWeightDraft("1.2")).toBe(1.2)
    expect(normalizeWeightDraft("2.5")).toBe(2.5)
  })

  it("parseWeekPatternInput returns zero for invalid input", () => {
    expect(parseWeekPatternInput("abc")).toBe(0)
  })
})

describe("formatPatternSum", () => {
  it("formats with max one decimal and no trailing .0", () => {
    expect(formatPatternSum(5)).toBe("5")
    expect(formatPatternSum(5.0)).toBe("5")
    expect(formatPatternSum(5.5)).toBe("5.5")
    expect(formatPatternSum(6.2)).toBe("6.2")
    expect(formatPatternSum(6.0)).toBe("6")
  })
})

describe("financial formatting helpers", () => {
  it("formats large numbers with thousand separators", () => {
    expect(formatFinancialNumber(270000)).toBe("270,000")
    expect(formatFinancialNumber("270000.5")).toBe("270,000.5")
    expect(formatFinancialNumber("12500")).toBe("12,500")
  })

  it("parses comma-formatted input", () => {
    expect(parseFinancialInput("270,000")).toBe("270000")
    expect(parseFinancialInput("270000")).toBe("270000")
  })

  it("allows in-progress financial drafts", () => {
    expect(isAllowedFinancialDraft("270,")).toBe(true)
    expect(isAllowedFinancialDraft("0.")).toBe(true)
    expect(parseFinancialInput("0.")).toBeNull()
  })

  it("normalizeFinancialForApi strips commas", () => {
    expect(normalizeFinancialForApi("270,000")).toBe("270000")
    expect(normalizeFinancialForApi("270,000.5")).toBe("270000.5")
    expect(normalizeFinancialForApi("270,000")).not.toContain(",")
  })
})

describe("draftsToWeightPattern", () => {
  it("flags incomplete drafts and uses fallback for preview", () => {
    const fallback = [1, 1, 1, 1, 1, 1, 1]
    const { pattern, invalidIndexes } = draftsToWeightPattern(
      ["0.", "1", "1", "1", "1", "1", "1"],
      fallback
    )
    expect(invalidIndexes).toEqual([0])
    expect(pattern[0]).toBe(1)
  })
})

describe("selectAllOnFocus", () => {
  it("selects entire input value Excel-style", () => {
    const input = { select: jest.fn() } as unknown as HTMLInputElement
    selectAllOnFocus({ currentTarget: input })
    expect(input.select).toHaveBeenCalled()
  })
})

describe("focusNextWeekPatternField", () => {
  it("focuses next weekday input", () => {
    const mon = { focus: jest.fn() } as unknown as HTMLInputElement
    const tue = { focus: jest.fn() } as unknown as HTMLInputElement
    focusNextWeekPatternField(0, [mon, tue], null)
    expect(tue.focus).toHaveBeenCalled()
  })

  it("focuses save button after Sat", () => {
    const sat = { focus: jest.fn() } as unknown as HTMLInputElement
    const save = { focus: jest.fn() } as unknown as HTMLButtonElement
    focusNextWeekPatternField(6, [null, null, null, null, null, null, sat], save)
    expect(save.focus).toHaveBeenCalled()
  })
})

describe("handleTargetEnterKey", () => {
  it("focuses Sun week pattern input on Enter", () => {
    const sun = { focus: jest.fn() } as unknown as HTMLInputElement
    const preventDefault = jest.fn()
    handleTargetEnterKey({ key: "Enter", preventDefault }, sun)
    expect(preventDefault).toHaveBeenCalled()
    expect(sun.focus).toHaveBeenCalled()
  })

  it("ignores non-Enter keys", () => {
    const sun = { focus: jest.fn() } as unknown as HTMLInputElement
    handleTargetEnterKey({ key: "Tab", preventDefault: jest.fn() }, sun)
    expect(sun.focus).not.toHaveBeenCalled()
  })
})

describe("handleWeekPatternEnterKey", () => {
  it("moves focus on Enter without submitting", () => {
    const tue = { focus: jest.fn() } as unknown as HTMLInputElement
    const preventDefault = jest.fn()
    handleWeekPatternEnterKey(
      { key: "Enter", preventDefault },
      0,
      [null, tue],
      null
    )
    expect(preventDefault).toHaveBeenCalled()
    expect(tue.focus).toHaveBeenCalled()
  })

  it("ignores non-Enter keys", () => {
    const tue = { focus: jest.fn() } as unknown as HTMLInputElement
    handleWeekPatternEnterKey(
      { key: "Tab", preventDefault: jest.fn() },
      0,
      [null, tue],
      null
    )
    expect(tue.focus).not.toHaveBeenCalled()
  })
})

describe("DEFAULT_WEEK_PATTERN", () => {
  it("defaults to all ones", () => {
    expect(DEFAULT_WEEK_PATTERN).toEqual([1, 1, 1, 1, 1, 1, 1])
  })
})
