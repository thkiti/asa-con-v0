import { mergeDailyBranchSummary } from "@/lib/reporting/composite"

describe("mergeDailyBranchSummary", () => {
  it("merges stock AVG_COST totals with sales revenue slice", () => {
    const merged = mergeDailyBranchSummary({
      branchId: "b1",
      day: "2026-05-22",
      stock: {
        valuationMethod: "AVG_COST",
        rows: [],
        totals: { qty: 10, totalValue: "100.000000" },
      },
      sales: {
        saleCount: 2,
        revenue: "250.00",
        paymentBreakdown: [],
        cashierSummary: [],
        productTypeBreakdown: [],
      },
    })

    expect(merged).toEqual({
      branchId: "b1",
      day: "2026-05-22",
      stock: {
        valuationMethod: "AVG_COST",
        totals: { qty: 10, totalValue: "100.000000" },
      },
      sales: { saleCount: 2, revenue: "250.00" },
    })
  })
})
