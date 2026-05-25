import * as glBalance from "@/lib/finance/gl-balance"
import {
  computeVariance,
  reconcileInventory,
  reconcileSalesAndTender,
} from "@/lib/finance/reconciliation"
import * as salesSummary from "@/lib/pos/sales-summary"
import * as stockSummary from "@/lib/stock/stock-summary"

describe("reconciliation variance math", () => {
  it("computes operational minus gl without clamping", () => {
    expect(computeVariance("1000", "995")).toBe("5")
    expect(computeVariance("995", "1000")).toBe("-5")
  })
})

describe("reconcileInventory", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("returns inventory variance DTO from operational and GL totals", async () => {
    jest.spyOn(stockSummary, "getStockSummary").mockResolvedValue({
      valuationMethod: "AVG_COST",
      rows: [],
      totals: { qty: 10, totalValue: "1000.00" },
    })
    jest.spyOn(glBalance, "getGlAccountBalance").mockResolvedValue({
      filter: { accountCodes: ["1000"] },
      accounts: [
        {
          accountCode: "1000",
          accountName: "Inventory",
          accountType: "ASSET",
          debitTotal: "995.00",
          creditTotal: "0.00",
          balance: "995.00",
        },
      ],
      totals: { debitTotal: "995.00", creditTotal: "0.00" },
    })

    const result = await reconcileInventory({} as never, { branchId: "branch-1" })

    expect(result.operationalTotalValue).toBe("1000.00")
    expect(result.glInventoryBalance).toBe("995.00")
    expect(result.variances).toHaveLength(1)
    expect(result.variances[0]).toMatchObject({
      domain: "inventory",
      operationalAmount: "1000.00",
      glAmount: "995.00",
      variance: "5",
    })
  })
})

describe("reconcileSalesAndTender", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("returns revenue and tender variance DTOs", async () => {
    jest.spyOn(salesSummary, "getSalesSummary").mockResolvedValue({
      saleCount: 2,
      revenue: "1500.00",
      paymentBreakdown: [
        { method: "CASH" as never, amount: "900.00", saleCount: 1 },
        { method: "CARD" as never, amount: "600.00", saleCount: 1 },
      ],
      cashierSummary: [],
      productTypeBreakdown: [],
    })
    jest.spyOn(glBalance, "getGlAccountBalance").mockResolvedValue({
      filter: { accountCodes: ["4000", "1100", "1110"] },
      accounts: [
        {
          accountCode: "4000",
          accountName: "Revenue",
          accountType: "REVENUE",
          debitTotal: "0.00",
          creditTotal: "1490.00",
          balance: "1490.00",
        },
        {
          accountCode: "1100",
          accountName: "Cash",
          accountType: "ASSET",
          debitTotal: "895.00",
          creditTotal: "0.00",
          balance: "895.00",
        },
        {
          accountCode: "1110",
          accountName: "Card clearing",
          accountType: "ASSET",
          debitTotal: "600.00",
          creditTotal: "0.00",
          balance: "600.00",
        },
      ],
      totals: { debitTotal: "1495.00", creditTotal: "1490.00" },
    })

    const result = await reconcileSalesAndTender({} as never, {})

    expect(result.variances[0]).toMatchObject({
      domain: "revenue",
      variance: "10",
    })
    expect(result.paymentBreakdown[0]).toMatchObject({
      label: "Cash tender vs cash GL",
      variance: "5",
    })
    expect(result.paymentBreakdown[1]).toMatchObject({
      label: "Card tender vs card clearing GL",
      variance: "0",
    })
  })
})
