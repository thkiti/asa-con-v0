import {
  defaultCollectorPickupSettlementUiFilter,
  isCollectorPickupMoreFilterActive,
  resolveCollectorPickupSettlementDateRange,
  toCollectorPickupFinanceFilter,
} from "@/lib/finance-ui/collector-pickup-settlement-list-filter"

describe("collector-pickup-settlement-list-filter", () => {
  it("maps period 2026-06 to full June date range", () => {
    expect(
      resolveCollectorPickupSettlementDateRange({
        periodKey: "2026-06",
        dateFrom: "",
        dateTo: "",
      })
    ).toEqual({
      from: "2026-06-01",
      to: "2026-06-30",
    })
  })

  it("prefers advanced date range over period", () => {
    expect(
      resolveCollectorPickupSettlementDateRange({
        periodKey: "2026-06",
        dateFrom: "2026-06-30",
        dateTo: "2026-07-01",
      })
    ).toEqual({
      from: "2026-06-30",
      to: "2026-07-01",
    })
  })

  it("marks more filter active only when advanced dates differ from period range", () => {
    expect(
      isCollectorPickupMoreFilterActive({
        periodKey: "2026-06",
        dateFrom: "",
        dateTo: "",
      })
    ).toBe(false)

    expect(
      isCollectorPickupMoreFilterActive({
        periodKey: "2026-06",
        dateFrom: "2026-06-30",
        dateTo: "2026-07-01",
      })
    ).toBe(true)
  })

  it("builds finance filter for SH001 June inquiry", () => {
    expect(
      toCollectorPickupFinanceFilter({
        branchId: "branch-sh001",
        periodKey: "2026-06",
        dateFrom: "",
        dateTo: "",
      })
    ).toEqual({
      branchId: "branch-sh001",
      from: "2026-06-01",
      to: "2026-06-30",
    })
  })

  it("defaults to current month period", () => {
    const defaults = defaultCollectorPickupSettlementUiFilter(new Date("2026-06-15T12:00:00.000Z"))
    expect(defaults.periodKey).toBe("2026-06")
    expect(defaults.branchId).toBe("")
    expect(defaults.dateFrom).toBe("")
    expect(defaults.dateTo).toBe("")
  })
})
