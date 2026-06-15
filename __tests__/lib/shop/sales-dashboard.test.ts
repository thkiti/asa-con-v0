jest.mock("@/lib/pos/sales-dashboard-metrics", () => ({
  getSalesDashboardMetrics: jest.fn(),
}))

jest.mock("@/lib/shop/sales-targets", () => ({
  listActiveShopBranches: jest.fn(),
  getBranchSalesTarget: jest.fn(),
  splitMonthlyTargetToDaily: jest.requireActual("@/lib/shop/sales-targets")
    .splitMonthlyTargetToDaily,
}))

import { getSalesDashboardMetrics } from "@/lib/pos/sales-dashboard-metrics"
import {
  getBranchSalesTarget,
  listActiveShopBranches,
} from "@/lib/shop/sales-targets"
import { buildSalesDashboardView } from "@/lib/shop/sales-dashboard"

const mockedMetrics = getSalesDashboardMetrics as jest.MockedFunction<
  typeof getSalesDashboardMetrics
>
const mockedBranches = listActiveShopBranches as jest.MockedFunction<
  typeof listActiveShopBranches
>
const mockedTarget = getBranchSalesTarget as jest.MockedFunction<
  typeof getBranchSalesTarget
>

describe("buildSalesDashboardView", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedBranches.mockResolvedValue([
      { id: "b1", code: "SH01", name: "Shop 1" },
      { id: "b2", code: "SH02", name: "Shop 2" },
    ])
  })

  it("aggregates All Company gross, refunds, net and day actuals", async () => {
    mockedTarget.mockResolvedValue({
      branchId: "b1",
      year: 2026,
      month: 6,
      monthlyTotal: "0",
      weekPattern: [1, 1, 1, 1, 1, 1, 1],
      exists: false,
    })

    mockedMetrics
      .mockResolvedValueOnce({
        year: 2026,
        month: 6,
        monthSummary: {
          grossSales: "100.00",
          refunds: "10.00",
          netSales: "90.00",
          billCount: 2,
        },
        days: [{ dateKey: "2026-06-05", grossSales: "100.00" }],
      })
      .mockResolvedValueOnce({
        year: 2026,
        month: 6,
        monthSummary: {
          grossSales: "50.00",
          refunds: "5.00",
          netSales: "45.00",
          billCount: 1,
        },
        days: [{ dateKey: "2026-06-05", grossSales: "50.00" }],
      })
      .mockResolvedValueOnce({
        year: 2026,
        month: 5,
        monthSummary: {
          grossSales: "0.00",
          refunds: "0.00",
          netSales: "0.00",
          billCount: 0,
        },
        days: [{ dateKey: "2026-05-01", grossSales: "40.00" }],
      })
      .mockResolvedValueOnce({
        year: 2026,
        month: 5,
        monthSummary: {
          grossSales: "0.00",
          refunds: "0.00",
          netSales: "0.00",
          billCount: 0,
        },
        days: [{ dateKey: "2026-05-01", grossSales: "20.00" }],
      })

    const view = await buildSalesDashboardView({} as never, {
      year: 2026,
      month: 6,
    })

    expect(view.scope).toBe("company")
    expect(view.monthSummary.grossSales).toBe("150.00")
    expect(view.monthSummary.refunds).toBe("15.00")
    expect(view.monthSummary.netSales).toBe("135.00")
    expect(view.monthSummary.lastMonthSales).toBe("60.00")
    expect(view.monthSummary.billCount).toBe(3)
    const day5 = view.days.find((d) => d.dateKey === "2026-06-05")
    expect(day5?.actualGross).toBe("150.00")
    expect(day5?.lastMonthGross).toBe("60.00")
    expect(day5?.target).toBeNull()
    expect(view.hasAnyTarget).toBe(false)
    expect(view.previousMonthWeekdayPatterns[5]).toBe("6.20")
    expect(view.previousMonthWeekdayPatterns[0]).toBe("0.00")
  })

  it("derives weekday patterns from previous month only for branch scope", async () => {
    mockedBranches.mockResolvedValue([{ id: "b1", code: "SH01", name: "Shop 1" }])
    mockedTarget.mockResolvedValue({
      branchId: "b1",
      year: 2026,
      month: 6,
      monthlyTotal: "0",
      weekPattern: [1, 1, 1, 1, 1, 1, 1],
      exists: false,
    })

    mockedMetrics
      .mockResolvedValueOnce({
        year: 2026,
        month: 6,
        monthSummary: {
          grossSales: "0.00",
          refunds: "0.00",
          netSales: "0.00",
          billCount: 0,
        },
        days: [],
      })
      .mockResolvedValueOnce({
        year: 2026,
        month: 5,
        monthSummary: {
          grossSales: "100.00",
          refunds: "0.00",
          netSales: "100.00",
          billCount: 1,
        },
        days: [{ dateKey: "2026-05-01", grossSales: "100.00" }],
      })

    const view = await buildSalesDashboardView({} as never, {
      year: 2026,
      month: 6,
      branchId: "b1",
    })

    expect(view.previousMonthWeekdayPatterns[5]).toBe("6.20")
    expect(view.previousMonthWeekdayPatterns[0]).toBe("0.00")
  })

  it("returns null weekday patterns when previous month has no sales", async () => {
    mockedTarget.mockResolvedValue({
      branchId: "b1",
      year: 2026,
      month: 6,
      monthlyTotal: "0",
      weekPattern: [1, 1, 1, 1, 1, 1, 1],
      exists: false,
    })

    mockedMetrics
      .mockResolvedValueOnce({
        year: 2026,
        month: 6,
        monthSummary: {
          grossSales: "0.00",
          refunds: "0.00",
          netSales: "0.00",
          billCount: 0,
        },
        days: [],
      })
      .mockResolvedValueOnce({
        year: 2026,
        month: 5,
        monthSummary: {
          grossSales: "0.00",
          refunds: "0.00",
          netSales: "0.00",
          billCount: 0,
        },
        days: [],
      })

    const view = await buildSalesDashboardView({} as never, {
      year: 2026,
      month: 6,
      branchId: "b1",
    })

    expect(view.previousMonthWeekdayPatterns.every((value) => value === null)).toBe(
      true
    )
  })

  it("sums daily targets when branch has target row", async () => {
    mockedBranches.mockResolvedValue([{ id: "b1", code: "SH01", name: "Shop 1" }])
    mockedTarget.mockResolvedValue({
      branchId: "b1",
      year: 2026,
      month: 6,
      monthlyTotal: "3000",
      weekPattern: [1, 1, 1, 1, 1, 1, 1],
      exists: true,
    })
    mockedMetrics
      .mockResolvedValueOnce({
        year: 2026,
        month: 6,
        monthSummary: {
          grossSales: "0.00",
          refunds: "0.00",
          netSales: "0.00",
          billCount: 0,
        },
        days: [],
      })
      .mockResolvedValueOnce({
        year: 2026,
        month: 5,
        monthSummary: {
          grossSales: "0.00",
          refunds: "0.00",
          netSales: "0.00",
          billCount: 0,
        },
        days: [],
      })

    const view = await buildSalesDashboardView({} as never, {
      year: 2026,
      month: 6,
      branchId: "b1",
    })

    expect(view.scope).toBe("branch")
    expect(view.hasAnyTarget).toBe(true)
    expect(view.days.some((d) => d.target != null && d.target !== "0.00")).toBe(true)
  })
})
