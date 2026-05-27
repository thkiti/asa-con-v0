import {
  buildApiFilter,
  deriveRowStatus,
  filterDashboardRows,
  periodKeyToDateRange,
  summarizeDashboardRows,
  toDashboardRows,
  varianceRowsFromResults,
} from "@/lib/finance-ui/reconciliation"
import type {
  InventoryReconciliationResult,
  ReconciliationVariance,
  SalesReconciliationResult,
} from "@/lib/finance-ui/types"

describe("deriveRowStatus", () => {
  it("returns MATCHED for zero variance", () => {
    expect(deriveRowStatus("100", "100", "0")).toBe("MATCHED")
  })

  it("returns MISSING_SOURCE when operational is zero", () => {
    expect(deriveRowStatus("0", "50", "50")).toBe("MISSING_SOURCE")
  })

  it("returns MISSING_GL when GL is zero", () => {
    expect(deriveRowStatus("50", "0", "50")).toBe("MISSING_GL")
  })

  it("returns VARIANCE when both sides differ", () => {
    expect(deriveRowStatus("100", "95", "5")).toBe("VARIANCE")
  })
})

describe("periodKeyToDateRange", () => {
  it("maps YYYY-MM to month bounds", () => {
    expect(periodKeyToDateRange("2026-05")).toEqual({
      from: "2026-05-01",
      to: "2026-05-31",
    })
  })

  it("returns null for invalid keys", () => {
    expect(periodKeyToDateRange("2026-13")).toBeNull()
    expect(periodKeyToDateRange("bad")).toBeNull()
  })
})

describe("buildApiFilter", () => {
  it("derives from/to from periodKey", () => {
    expect(
      buildApiFilter({ periodKey: "2026-05", branchId: "branch-1" })
    ).toEqual({
      branchId: "branch-1",
      from: "2026-05-01",
      to: "2026-05-31",
    })
  })
})

describe("varianceRowsFromResults", () => {
  it("merges inventory and sales rows without duplicates", () => {
    const inventory: InventoryReconciliationResult = {
      filter: {},
      operationalTotalValue: "100",
      glInventoryBalance: "100",
      variances: [
        {
          domain: "inventory",
          label: "Stock valuation vs inventory GL",
          operationalAmount: "100",
          glAmount: "100",
          variance: "0",
        },
      ],
    }
    const sales: SalesReconciliationResult = {
      filter: {},
      operationalRevenue: "500",
      glRevenueBalance: "500",
      paymentBreakdown: [],
      variances: [
        {
          domain: "revenue",
          label: "POS revenue vs revenue GL",
          operationalAmount: "500",
          glAmount: "500",
          variance: "0",
        },
        {
          domain: "tender",
          label: "Cash tender vs cash GL",
          operationalAmount: "500",
          glAmount: "500",
          variance: "0",
        },
      ],
    }

    const rows = varianceRowsFromResults({ inventory, sales })
    expect(rows).toHaveLength(3)
  })
})

describe("summarizeDashboardRows", () => {
  it("counts matched and variance totals", () => {
    const rows = toDashboardRows({
      rows: [
        {
          domain: "inventory",
          label: "A",
          operationalAmount: "100",
          glAmount: "100",
          variance: "0",
        },
        {
          domain: "revenue",
          label: "B",
          operationalAmount: "100",
          glAmount: "90",
          variance: "10",
        },
      ] satisfies ReconciliationVariance[],
      periodLabel: "2026-05",
    })

    expect(summarizeDashboardRows(rows)).toEqual({
      matchedCount: 1,
      unmatchedCount: 1,
      varianceCount: 1,
      totalVarianceAmount: "10.00",
      rowCount: 2,
    })
  })
})

describe("filterDashboardRows", () => {
  const rows = toDashboardRows({
    rows: [
      {
        domain: "inventory",
        label: "Inv",
        operationalAmount: "100",
        glAmount: "100",
        variance: "0",
      },
      {
        domain: "revenue",
        label: "Rev",
        operationalAmount: "100",
        glAmount: "90",
        variance: "10",
      },
    ] satisfies ReconciliationVariance[],
    periodLabel: "2026-05",
  })

  it("filters by domain", () => {
    expect(filterDashboardRows(rows, { domain: "inventory" })).toHaveLength(1)
  })

  it("filters by status", () => {
    expect(filterDashboardRows(rows, { status: "VARIANCE" })).toHaveLength(1)
  })
})
