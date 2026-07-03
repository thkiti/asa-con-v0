import {
  defaultPeriodReconciliationUiFilter,
  isPeriodReconciliationMoreFilterActive,
  parsePeriodReconciliationUiFilterFromSearchParams,
  resolvePeriodReconciliationPeriodKey,
  toPeriodReconciliationListQuery,
} from "@/lib/finance-ui/period-reconciliation-list-filter"

describe("period-reconciliation-list-filter", () => {
  it("resolves period key from period input", () => {
    expect(
      resolvePeriodReconciliationPeriodKey({
        periodKey: "2026-01",
        dateFrom: "",
        dateTo: "",
      })
    ).toBe("2026-01")
  })

  it("falls back to dateFrom month when period key is invalid", () => {
    expect(
      resolvePeriodReconciliationPeriodKey({
        periodKey: "",
        dateFrom: "2026-03-15",
        dateTo: "",
      })
    ).toBe("2026-03")
  })

  it("detects active more-filter when date range differs from period", () => {
    expect(
      isPeriodReconciliationMoreFilterActive({
        periodKey: "2026-06",
        dateFrom: "2026-06-01",
        dateTo: "2026-06-15",
      })
    ).toBe(true)
  })

  it("builds list query with branch and account", () => {
    expect(
      toPeriodReconciliationListQuery({
        ...defaultPeriodReconciliationUiFilter(),
        periodKey: "2026-05",
        branchId: "branch-1",
        glAccountId: "gl-1",
      })
    ).toEqual({
      periodKey: "2026-05",
      branchId: "branch-1",
      glAccountId: "gl-1",
    })
  })

  it("parses search params into filter state", () => {
    const params = new URLSearchParams({
      periodKey: "2026-05",
      branchId: "branch-1",
      glAccountId: "gl-1",
    })

    expect(parsePeriodReconciliationUiFilterFromSearchParams(params)).toEqual({
      periodKey: "2026-05",
      dateFrom: "",
      dateTo: "",
      branchId: "branch-1",
      glAccountId: "gl-1",
    })
  })
})
