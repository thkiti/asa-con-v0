jest.mock("@/lib/pos/sales-dashboard-metrics", () => ({
  getSalesDashboardMetrics: jest.fn(),
}))

jest.mock("@/lib/shop/sales-targets", () => ({
  getBranchSalesTarget: jest.fn(),
  splitMonthlyTargetToDaily: jest.requireActual("@/lib/shop/sales-targets")
    .splitMonthlyTargetToDaily,
}))

import { getSalesDashboardMetrics } from "@/lib/pos/sales-dashboard-metrics"
import {
  buildPosTargetVsSalesSummary,
  formatPosTargetVsSalesMonthLabel,
} from "@/lib/pos/target-vs-sales"
import { getBranchSalesTarget } from "@/lib/shop/sales-targets"

const mockedMetrics = getSalesDashboardMetrics as jest.MockedFunction<
  typeof getSalesDashboardMetrics
>
const mockedTarget = getBranchSalesTarget as jest.MockedFunction<
  typeof getBranchSalesTarget
>

const branchId = "b1"
const bangkokJune6 = new Date("2026-06-06T12:00:00+07:00")

describe("buildPosTargetVsSalesSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns today/month summaries and achievement from gross sales only", async () => {
    mockedTarget.mockResolvedValue({
      branchId,
      year: 2026,
      month: 6,
      monthlyTotal: "100000.00",
      weekPattern: [1, 1, 1, 1, 1, 1, 1],
      exists: true,
    })
    mockedMetrics.mockResolvedValue({
      year: 2026,
      month: 6,
      monthSummary: {
        year: 2026,
        month: 6,
        grossSales: "50000.00",
        refunds: "10000.00",
        netSales: "40000.00",
        billCount: 12,
      },
      days: [
        { dateKey: "2026-06-05", grossSales: "10000.00" },
        { dateKey: "2026-06-06", grossSales: "15000.00" },
      ],
    })

    const db = {
      branch: {
        findUnique: async () => ({ code: "SH001" }),
      },
    }

    const summary = await buildPosTargetVsSalesSummary(db as never, {
      branchId,
      now: bangkokJune6,
    })

    expect(summary.branchCode).toBe("SH001")
    expect(summary.monthLabel).toBe("June 2026")
    expect(summary.today.actual).toBe("15000.00")
    expect(summary.month.actual).toBe("50000.00")
    expect(summary.month.target).toBe("100000.00")
    expect(summary.month.achievementPercent).toBe("50.0")
    expect(summary.days.find((d) => d.isToday)?.dateKey).toBe("2026-06-06")
  })

  it("shows null targets and achievement when branch has no target row", async () => {
    mockedTarget.mockResolvedValue({
      branchId,
      year: 2026,
      month: 6,
      monthlyTotal: "0",
      weekPattern: [1, 1, 1, 1, 1, 1, 1],
      exists: false,
    })
    mockedMetrics.mockResolvedValue({
      year: 2026,
      month: 6,
      monthSummary: {
        year: 2026,
        month: 6,
        grossSales: "1000.00",
        refunds: "0.00",
        netSales: "1000.00",
        billCount: 1,
      },
      days: [{ dateKey: "2026-06-06", grossSales: "1000.00" }],
    })

    const summary = await buildPosTargetVsSalesSummary(
      {
        branch: { findUnique: async () => ({ code: "SH001" }) },
      } as never,
      { branchId, now: bangkokJune6 }
    )

    expect(summary.today.target).toBeNull()
    expect(summary.month.target).toBeNull()
    expect(summary.month.achievementPercent).toBeNull()
    expect(summary.days[0]?.target).toBeNull()
  })
})

describe("formatPosTargetVsSalesMonthLabel", () => {
  it("formats month and year", () => {
    expect(formatPosTargetVsSalesMonthLabel(2026, 6)).toBe("June 2026")
  })
})
