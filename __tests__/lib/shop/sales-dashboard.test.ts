jest.mock("@/lib/pos/sales-dashboard-metrics", () => ({
  getSalesDashboardMetrics: jest.fn(),
  getSalesDashboardAmountsByDayInRange: jest.fn(),
  getSalesDashboardRefundsTotalInRange: jest.fn(),
}))

jest.mock("@/lib/shop/sales-targets", () => ({
  listActiveShopBranches: jest.fn(),
  getBranchSalesTarget: jest.fn(),
  splitMonthlyTargetToDaily: jest.requireActual("@/lib/shop/sales-targets")
    .splitMonthlyTargetToDaily,
}))

import { Prisma } from "@/generated/prisma/client"
import {
  getSalesDashboardAmountsByDayInRange,
  getSalesDashboardMetrics,
  getSalesDashboardRefundsTotalInRange,
} from "@/lib/pos/sales-dashboard-metrics"
import {
  getBranchSalesTarget,
  listActiveShopBranches,
} from "@/lib/shop/sales-targets"
import { buildSalesDashboardView } from "@/lib/shop/sales-dashboard"

const mockedMetrics = getSalesDashboardMetrics as jest.MockedFunction<
  typeof getSalesDashboardMetrics
>
const mockedAmountsByDay =
  getSalesDashboardAmountsByDayInRange as jest.MockedFunction<
    typeof getSalesDashboardAmountsByDayInRange
  >
const mockedRefundsInRange =
  getSalesDashboardRefundsTotalInRange as jest.MockedFunction<
    typeof getSalesDashboardRefundsTotalInRange
  >
const mockedBranches = listActiveShopBranches as jest.MockedFunction<
  typeof listActiveShopBranches
>
const mockedTarget = getBranchSalesTarget as jest.MockedFunction<
  typeof getBranchSalesTarget
>

function monthSummaryStub(
  partial: Partial<{
    year: number
    month: number
    grossSales: string
    actualVat: string
    actualNet: string
    refunds: string
    netSales: string
    billCount: number
  }> & {
    grossSales: string
    refunds: string
    netSales: string
    billCount: number
  }
) {
  const gross = partial.grossSales
  const vat = partial.actualVat ?? "0.00"
  return {
    year: partial.year ?? 2026,
    month: partial.month ?? 6,
    grossSales: gross,
    actualVat: vat,
    actualNet:
      partial.actualNet ??
      (Number(gross) - Number(vat)).toFixed(2),
    refunds: partial.refunds,
    netSales: partial.netSales,
    billCount: partial.billCount,
  }
}

function dayStub(dateKey: string, grossSales: string, vatSales = "0.00") {
  return { dateKey, grossSales, vatSales }
}

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
        monthSummary: monthSummaryStub({
          grossSales: "100.00",
          actualVat: "6.54",
          refunds: "10.00",
          netSales: "90.00",
          billCount: 2,
        }),
        days: [dayStub("2026-06-05", "100.00", "6.54")],
      })
      .mockResolvedValueOnce({
        year: 2026,
        month: 6,
        monthSummary: monthSummaryStub({
          grossSales: "50.00",
          actualVat: "3.27",
          refunds: "5.00",
          netSales: "45.00",
          billCount: 1,
        }),
        days: [dayStub("2026-06-05", "50.00", "3.27")],
      })
      .mockResolvedValueOnce({
        year: 2026,
        month: 5,
        monthSummary: monthSummaryStub({
          month: 5,
          grossSales: "0.00",
          refunds: "0.00",
          netSales: "0.00",
          billCount: 0,
        }),
        days: [dayStub("2026-05-01", "40.00")],
      })
      .mockResolvedValueOnce({
        year: 2026,
        month: 5,
        monthSummary: monthSummaryStub({
          month: 5,
          grossSales: "0.00",
          refunds: "0.00",
          netSales: "0.00",
          billCount: 0,
        }),
        days: [dayStub("2026-05-01", "20.00")],
      })

    const view = await buildSalesDashboardView({} as never, {
      year: 2026,
      month: 6,
    })

    expect(view.scope).toBe("company")
    expect(view.monthSummary.grossSales).toBe("150.00")
    expect(view.monthSummary.actualVat).toBe("9.81")
    expect(view.monthSummary.actualNet).toBe("140.19")
    expect(view.monthSummary.refunds).toBe("15.00")
    expect(view.monthSummary.netSales).toBe("135.00")
    expect(view.monthSummary.lastMonthSales).toBe("60.00")
    expect(view.monthSummary.billCount).toBe(3)
    const day5 = view.days.find((d) => d.dateKey === "2026-06-05")
    expect(day5?.actualGross).toBe("150.00")
    expect(day5?.actualVat).toBe("9.81")
    expect(day5?.actualNet).toBe("140.19")
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
        monthSummary: monthSummaryStub({ grossSales: "0.00", refunds: "0.00", netSales: "0.00", billCount: 0 }),
        days: [],
      })
      .mockResolvedValueOnce({
        year: 2026,
        month: 5,
        monthSummary: monthSummaryStub({ grossSales: "100.00", refunds: "0.00", netSales: "100.00", billCount: 1 }),
        days: [dayStub("2026-05-01", "100.00")],
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
        monthSummary: monthSummaryStub({ grossSales: "0.00", refunds: "0.00", netSales: "0.00", billCount: 0 }),
        days: [],
      })
      .mockResolvedValueOnce({
        year: 2026,
        month: 5,
        monthSummary: monthSummaryStub({ grossSales: "0.00", refunds: "0.00", netSales: "0.00", billCount: 0 }),
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
        monthSummary: monthSummaryStub({ grossSales: "0.00", refunds: "0.00", netSales: "0.00", billCount: 0 }),
        days: [],
      })
      .mockResolvedValueOnce({
        year: 2026,
        month: 5,
        monthSummary: monthSummaryStub({ grossSales: "0.00", refunds: "0.00", netSales: "0.00", billCount: 0 }),
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

  it("keeps default month view when yearToDate is false", async () => {
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
        monthSummary: monthSummaryStub({ grossSales: "10.00", refunds: "0.00", netSales: "10.00", billCount: 1 }),
        days: [dayStub("2026-06-05", "10.00")],
      })
      .mockResolvedValueOnce({
        year: 2026,
        month: 5,
        monthSummary: monthSummaryStub({ grossSales: "0.00", refunds: "0.00", netSales: "0.00", billCount: 0 }),
        days: [dayStub("2026-05-01", "4.00")],
      })

    const view = await buildSalesDashboardView({} as never, {
      year: 2026,
      month: 6,
      branchId: "b1",
      yearToDate: false,
    })

    expect(view.yearToDate).toBeFalsy()
    expect(mockedAmountsByDay).not.toHaveBeenCalled()
    const day5 = view.days.find((d) => d.dateKey === "2026-06-05")
    expect(day5?.actualGross).toBe("10.00")
  })

  it("puts YTD totals on summary only and keeps calendar on daily month values", async () => {
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
        monthSummary: monthSummaryStub({
          grossSales: "30.00",
          actualVat: "1.96",
          refunds: "0.00",
          netSales: "30.00",
          billCount: 2,
        }),
        days: [dayStub("2026-06-05", "30.00", "1.96")],
      })
      .mockResolvedValueOnce({
        year: 2026,
        month: 5,
        monthSummary: monthSummaryStub({
          grossSales: "0.00",
          refunds: "0.00",
          netSales: "0.00",
          billCount: 0,
        }),
        days: [dayStub("2026-05-01", "12.00")],
      })

    const makeMap = (entries: [string, string][]) =>
      new Map(entries.map(([key, value]) => [key, new Prisma.Decimal(value)]))

    mockedAmountsByDay
      .mockResolvedValueOnce({
        grossByDay: makeMap([
          ["2026-01-15", "100.00"],
          ["2026-06-05", "30.00"],
        ]),
        vatByDay: makeMap([
          ["2026-01-15", "6.54"],
          ["2026-06-05", "1.96"],
        ]),
      })
      .mockResolvedValueOnce({
        grossByDay: new Map(),
        vatByDay: new Map(),
      })
    mockedRefundsInRange.mockResolvedValue(new Prisma.Decimal(0))

    const view = await buildSalesDashboardView({} as never, {
      year: 2026,
      month: 6,
      branchId: "b1",
      yearToDate: true,
    })

    expect(view.yearToDate).toBe(true)
    const day5 = view.days.find((d) => d.dateKey === "2026-06-05")
    expect(day5?.actualGross).toBe("30.00")
    expect(day5?.actualVat).toBe("1.96")
    expect(day5?.lastMonthGross).toBe("12.00")
    expect(view.monthSummary.grossSales).toBe("130.00")
    expect(view.monthSummary.actualVat).toBe("8.50")
    expect(view.monthSummary.actualNet).toBe("121.50")
    expect(view.monthSummary.lastMonthSales).toBe("0.00")
    expect(view.monthSummary.billCount).toBe(2)
    expect(view.days).toHaveLength(30)
    expect(view.days[0]?.dateKey).toBe("2026-06-01")
    expect(view.days[view.days.length - 1]?.dateKey).toBe("2026-06-30")
  })
})
