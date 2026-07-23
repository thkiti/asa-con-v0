/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { PeriodSelector } from "@/components/ui/PeriodSelector"
import {
  buildPeriodKeyFromYearMonth,
  defaultPeriodSelectorParts,
  formatCompactMonthOptionLabel,
  PERIOD_SELECTOR_MONTH_VALUES,
  PERIOD_SELECTOR_YEAR_COUNT,
  periodSelectorYearOptions,
  parsePeriodKeyYearMonth,
  resolvePeriodSelectorParts,
} from "@/lib/ui/period-selector"
import {
  clearStockDocumentListFilters,
  defaultStockDocumentListFilters,
  resolveStockDocumentPeriodKey,
} from "@/lib/stock-ui/stock-document-list-filters"
import { normalizeFiltersForEntity } from "@/lib/stock/document-read/stock-document-entity-policy"
import { COMPACT_MONTH_VALUES } from "@/lib/shop-ui/month-select-options"

/** Fixed Bangkok-local noon so calendar parts are stable. */
const FIXED_NOW = new Date("2026-07-16T12:00:00+07:00")

describe("PeriodSelector helpers", () => {
  it("Year options contain exactly 10 entries", () => {
    const years = periodSelectorYearOptions(FIXED_NOW)
    expect(years).toHaveLength(PERIOD_SELECTOR_YEAR_COUNT)
    expect(years).toHaveLength(10)
  })

  it("Year range is current year - 2 through current year + 7", () => {
    expect(periodSelectorYearOptions(FIXED_NOW)).toEqual([
      2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033,
    ])
  })

  it("Current year is the default Year when no valid period is supplied", () => {
    expect(defaultPeriodSelectorParts(FIXED_NOW).year).toBe(2026)
    expect(resolvePeriodSelectorParts("", FIXED_NOW).year).toBe(2026)
    expect(resolvePeriodSelectorParts(null, FIXED_NOW).year).toBe(2026)
  })

  it("Default Month is the current month when no valid period is supplied", () => {
    expect(defaultPeriodSelectorParts(FIXED_NOW).month).toBe(7)
    expect(defaultPeriodSelectorParts(FIXED_NOW).periodKey).toBe("2026-07")
  })

  it("Month options come from the shared Month definition", () => {
    expect(PERIOD_SELECTOR_MONTH_VALUES).toEqual(COMPACT_MONTH_VALUES)
    expect(PERIOD_SELECTOR_MONTH_VALUES).toHaveLength(12)
  })

  it("Month labels use 01 • JAN through 12 • DEC", () => {
    expect(formatCompactMonthOptionLabel(1)).toBe("01 • JAN")
    expect(formatCompactMonthOptionLabel(7)).toBe("07 • JUL")
    expect(formatCompactMonthOptionLabel(12)).toBe("12 • DEC")
    const labels = PERIOD_SELECTOR_MONTH_VALUES.map(formatCompactMonthOptionLabel)
    expect(labels).toEqual([
      "01 • JAN",
      "02 • FEB",
      "03 • MAR",
      "04 • APR",
      "05 • MAY",
      "06 • JUN",
      "07 • JUL",
      "08 • AUG",
      "09 • SEP",
      "10 • OCT",
      "11 • NOV",
      "12 • DEC",
    ])
  })

  it("Year and Month combine into YYYY-MM", () => {
    expect(buildPeriodKeyFromYearMonth(2026, 7)).toBe("2026-07")
    expect(buildPeriodKeyFromYearMonth(2026, 1)).toBe("2026-01")
  })

  it("Changing Year preserves Month", () => {
    const parts = parsePeriodKeyYearMonth("2026-07")!
    expect(buildPeriodKeyFromYearMonth(2025, parts.month)).toBe("2025-07")
    expect(buildPeriodKeyFromYearMonth(2027, parts.month)).toBe("2027-07")
  })

  it("Changing Month preserves Year", () => {
    const parts = parsePeriodKeyYearMonth("2026-07")!
    expect(buildPeriodKeyFromYearMonth(parts.year, 3)).toBe("2026-03")
    expect(buildPeriodKeyFromYearMonth(parts.year, 12)).toBe("2026-12")
  })

  it("never emits an invalid/incomplete periodKey from builders", () => {
    expect(() => buildPeriodKeyFromYearMonth(2026, 0)).toThrow()
    expect(() => buildPeriodKeyFromYearMonth(2026, 13)).toThrow()
    expect(parsePeriodKeyYearMonth("2026")).toBeNull()
    expect(parsePeriodKeyYearMonth("2026-13")).toBeNull()
    expect(parsePeriodKeyYearMonth("")).toBeNull()
    expect(isValidEmit("2026-07")).toBe(true)
  })
})

function isValidEmit(periodKey: string): boolean {
  return parsePeriodKeyYearMonth(periodKey) != null
}

describe("PeriodSelector component", () => {
  it("renders Year and Month dropdowns with shared month labels", () => {
    const html = renderToStaticMarkup(
      <PeriodSelector periodKey="2026-07" onPeriodChange={() => {}} />
    )
    expect(html).toContain('data-testid="period-selector-year"')
    expect(html).toContain('data-testid="period-selector-month"')
    expect(html).toContain("Year")
    expect(html).toContain("Month")
    expect(html).toContain("01 • JAN")
    expect(html).toContain("07 • JUL")
    expect(html).toContain("2024")
    expect(html).toContain("2033")
    expect(html).not.toContain("YYYY • MM")
  })
})

describe("Stock Document period filter helpers", () => {
  it("list query and END use selected periodKey YYYY-MM", () => {
    expect(resolveStockDocumentPeriodKey("2026-01", FIXED_NOW)).toBe("2026-01")
    expect(defaultStockDocumentListFilters(FIXED_NOW).periodMonth).toBe("2026-07")
    // Controller maps PeriodSelector value into list filter.periodKey
    const periodKey = resolveStockDocumentPeriodKey("2026-01", FIXED_NOW)
    expect(periodKey).toMatch(/^\d{4}-\d{2}$/)
  })

  it("switching ASAD/ASAS preserves a valid period", () => {
    const preservedPeriod = "2026-01"
    const asNormalized = normalizeFiltersForEntity(
      "AS",
      { shopBranchId: "ho", docKind: "DEY" },
      { hoBranchId: "ho", shopOptionIds: new Set(["sh1"]) }
    )
    expect(asNormalized.docKind).toBe("")
    expect(resolveStockDocumentPeriodKey(preservedPeriod, FIXED_NOW)).toBe(
      preservedPeriod
    )

    const adNormalized = normalizeFiltersForEntity(
      "AD",
      { shopBranchId: "sh1", docKind: "ORD" },
      { hoBranchId: "ho", shopOptionIds: new Set(["sh1"]) }
    )
    expect(adNormalized.shopBranchId).toBe("ho")
    expect(resolveStockDocumentPeriodKey(preservedPeriod, FIXED_NOW)).toBe(
      preservedPeriod
    )
  })

  it("Clear restores the standard current Year and Month", () => {
    const cleared = clearStockDocumentListFilters({
      entityCode: "AS",
      hoBranchId: "ho",
      sessionShopBranchId: null,
      isHoViewer: true,
      now: FIXED_NOW,
    })
    expect(cleared.periodMonth).toBe("2026-07")
    expect(cleared.docKind).toBe("")
    expect(cleared.status).toBe("")
    expect(cleared.shopBranchId).toBe("")
  })

  it("ASAD/ASAS branch and document-type clear rules remain unchanged", () => {
    const asad = clearStockDocumentListFilters({
      entityCode: "AD",
      hoBranchId: "ho-id",
      sessionShopBranchId: "sh-id",
      isHoViewer: true,
      now: FIXED_NOW,
    })
    expect(asad.shopBranchId).toBe("ho-id")
    expect(asad.periodMonth).toBe("2026-07")

    const asasShop = clearStockDocumentListFilters({
      entityCode: "AS",
      hoBranchId: "ho-id",
      sessionShopBranchId: "sh-id",
      isHoViewer: false,
      now: FIXED_NOW,
    })
    expect(asasShop.shopBranchId).toBe("sh-id")
  })
})
