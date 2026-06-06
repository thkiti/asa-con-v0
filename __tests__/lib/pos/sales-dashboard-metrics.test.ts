import { Prisma, SaleStatus } from "@/generated/prisma/client"
import { getSalesDashboardMetrics } from "@/lib/pos/sales-dashboard-metrics"

type MockSale = {
  id: string
  branchId: string
  total: Prisma.Decimal
  status: SaleStatus
  createdAt: Date
}

type MockRefund = {
  id: string
  branchId: string
  saleId: string | null
  amount: Prisma.Decimal
  createdAt: Date
}

function createMockDb(state: { sales: MockSale[]; refunds: MockRefund[] }) {
  return {
    sale: {
      findMany: async ({
        where,
      }: {
        where: {
          branchId: string
          status: SaleStatus
          createdAt: { gte: Date; lte: Date }
        }
      }) => {
        return state.sales.filter(
          (row) =>
            row.branchId === where.branchId &&
            row.status === where.status &&
            row.createdAt >= where.createdAt.gte &&
            row.createdAt <= where.createdAt.lte
        )
      },
    },
    refund: {
      findMany: async ({
        where,
      }: {
        where: {
          branchId: string
          createdAt: { gte: Date; lte: Date }
        }
      }) => {
        return state.refunds.filter(
          (row) =>
            row.branchId === where.branchId &&
            row.createdAt >= where.createdAt.gte &&
            row.createdAt <= where.createdAt.lte
        )
      },
    },
  }
}

describe("getSalesDashboardMetrics", () => {
  const branchId = "branch-1"

  it("day cells show gross sales by sale date without subtracting refunds", async () => {
    const state = {
      sales: [
        {
          id: "sale-1",
          branchId,
          total: new Prisma.Decimal("100.00"),
          status: SaleStatus.COMPLETED,
          createdAt: new Date("2026-06-05T10:00:00+07:00"),
        },
        {
          id: "sale-2",
          branchId,
          total: new Prisma.Decimal("50.00"),
          status: SaleStatus.COMPLETED,
          createdAt: new Date("2026-06-05T15:00:00+07:00"),
        },
      ],
      refunds: [
        {
          id: "refund-1",
          branchId,
          saleId: "sale-1",
          amount: new Prisma.Decimal("100.00"),
          createdAt: new Date("2026-06-05T16:00:00+07:00"),
        },
      ],
    }

    const result = await getSalesDashboardMetrics(createMockDb(state), {
      branchId,
      year: 2026,
      month: 6,
    })

    const day5 = result.days.find((row) => row.dateKey === "2026-06-05")
    expect(day5?.grossSales).toBe("150.00")
    expect(result.monthSummary.grossSales).toBe("150.00")
    expect(result.monthSummary.refunds).toBe("100.00")
    expect(result.monthSummary.netSales).toBe("50.00")
  })

  it("counts refunds by refund.createdAt month not original sale month", async () => {
    const state = {
      sales: [
        {
          id: "sale-may",
          branchId,
          total: new Prisma.Decimal("200.00"),
          status: SaleStatus.COMPLETED,
          createdAt: new Date("2026-05-31T20:00:00+07:00"),
        },
        {
          id: "sale-june",
          branchId,
          total: new Prisma.Decimal("80.00"),
          status: SaleStatus.COMPLETED,
          createdAt: new Date("2026-06-02T10:00:00+07:00"),
        },
      ],
      refunds: [
        {
          id: "refund-june",
          branchId,
          saleId: "sale-may",
          amount: new Prisma.Decimal("200.00"),
          createdAt: new Date("2026-06-03T11:00:00+07:00"),
        },
      ],
    }

    const june = await getSalesDashboardMetrics(createMockDb(state), {
      branchId,
      year: 2026,
      month: 6,
    })

    expect(june.monthSummary.grossSales).toBe("80.00")
    expect(june.monthSummary.refunds).toBe("200.00")
    expect(june.monthSummary.netSales).toBe("-120.00")

    const may = await getSalesDashboardMetrics(createMockDb(state), {
      branchId,
      year: 2026,
      month: 5,
    })

    expect(may.monthSummary.grossSales).toBe("200.00")
    expect(may.monthSummary.refunds).toBe("0.00")
    expect(may.monthSummary.netSales).toBe("200.00")
  })

  it("returns zero gross for days with no sales", async () => {
    const result = await getSalesDashboardMetrics(
      createMockDb({ sales: [], refunds: [] }),
      { branchId, year: 2026, month: 6 }
    )

    expect(result.days).toHaveLength(30)
    expect(result.days.every((row) => row.grossSales === "0.00")).toBe(true)
    expect(result.monthSummary.grossSales).toBe("0.00")
  })
})
