import { Prisma, SaleStatus } from "@/generated/prisma/client"
import {
  getSalesDashboardAmountsByDayInRange,
  getSalesDashboardMetrics,
} from "@/lib/pos/sales-dashboard-metrics"

type MockSale = {
  id: string
  branchId: string
  total: Prisma.Decimal
  vatAmount: Prisma.Decimal | null
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
          vatAmount: new Prisma.Decimal("6.54"),
          status: SaleStatus.COMPLETED,
          createdAt: new Date("2026-06-05T10:00:00+07:00"),
        },
        {
          id: "sale-2",
          branchId,
          total: new Prisma.Decimal("50.00"),
          vatAmount: new Prisma.Decimal("3.27"),
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
    expect(day5?.vatSales).toBe("9.81")
    expect(result.monthSummary.grossSales).toBe("150.00")
    expect(result.monthSummary.actualVat).toBe("9.81")
    expect(result.monthSummary.actualNet).toBe("140.19")
    expect(result.monthSummary.refunds).toBe("100.00")
    expect(result.monthSummary.netSales).toBe("50.00")
    expect(result.monthSummary.billCount).toBe(2)
  })

  it("sums snapshotted VAT per receipt and keeps Actual = Net + VAT", async () => {
    const state = {
      sales: [
        {
          id: "sale-a",
          branchId,
          total: new Prisma.Decimal("107.00"),
          vatAmount: new Prisma.Decimal("7.00"),
          status: SaleStatus.COMPLETED,
          createdAt: new Date("2026-01-10T10:00:00+07:00"),
        },
        {
          id: "sale-b",
          branchId,
          // Per-receipt rounding: gross 100.00 → vat 6.54 (not monthly recompute)
          total: new Prisma.Decimal("100.00"),
          vatAmount: new Prisma.Decimal("6.54"),
          status: SaleStatus.COMPLETED,
          createdAt: new Date("2026-01-10T11:00:00+07:00"),
        },
        {
          id: "sale-c",
          branchId,
          total: new Prisma.Decimal("50.00"),
          vatAmount: new Prisma.Decimal("3.27"),
          status: SaleStatus.COMPLETED,
          createdAt: new Date("2026-01-11T09:00:00+07:00"),
        },
      ],
      refunds: [],
    }

    const result = await getSalesDashboardMetrics(createMockDb(state), {
      branchId,
      year: 2026,
      month: 1,
    })

    expect(result.monthSummary.grossSales).toBe("257.00")
    expect(result.monthSummary.actualVat).toBe("16.81")
    expect(result.monthSummary.actualNet).toBe("240.19")
    expect(
      Number(result.monthSummary.actualNet) + Number(result.monthSummary.actualVat)
    ).toBeCloseTo(Number(result.monthSummary.grossSales), 2)

    const day10 = result.days.find((row) => row.dateKey === "2026-01-10")
    expect(day10?.grossSales).toBe("207.00")
    expect(day10?.vatSales).toBe("13.54")
  })

  it("queries only COMPLETED sales so non-completed rows cannot enter Actual", async () => {
    const findMany = jest.fn().mockResolvedValue([])
    const db = {
      sale: { findMany },
      refund: { findMany: jest.fn().mockResolvedValue([]) },
    }

    await getSalesDashboardMetrics(db as never, {
      branchId,
      year: 2026,
      month: 1,
    })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: SaleStatus.COMPLETED,
        }),
      })
    )
  })

  it("January VAT-inclusive example: Actual = Net + VAT for 5,960 gross", async () => {
    const state = {
      sales: [
        {
          id: "sale-diff",
          branchId,
          total: new Prisma.Decimal("5960.00"),
          vatAmount: new Prisma.Decimal("389.91"),
          status: SaleStatus.COMPLETED,
          createdAt: new Date("2026-01-15T10:00:00+07:00"),
        },
      ],
      refunds: [],
    }

    const result = await getSalesDashboardMetrics(createMockDb(state), {
      branchId,
      year: 2026,
      month: 1,
    })

    expect(result.monthSummary.grossSales).toBe("5960.00")
    expect(result.monthSummary.actualVat).toBe("389.91")
    expect(result.monthSummary.actualNet).toBe("5570.09")
    expect(result.monthSummary.billCount).toBe(1)
  })

  it("counts refunds by refund.createdAt month not original sale month", async () => {
    const state = {
      sales: [
        {
          id: "sale-may",
          branchId,
          total: new Prisma.Decimal("200.00"),
          vatAmount: new Prisma.Decimal("13.08"),
          status: SaleStatus.COMPLETED,
          createdAt: new Date("2026-05-31T20:00:00+07:00"),
        },
        {
          id: "sale-june",
          branchId,
          total: new Prisma.Decimal("80.00"),
          vatAmount: new Prisma.Decimal("5.23"),
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
    expect(june.monthSummary.actualVat).toBe("5.23")
    expect(june.monthSummary.refunds).toBe("200.00")
    expect(june.monthSummary.netSales).toBe("-120.00")
    expect(june.monthSummary.billCount).toBe(1)

    const may = await getSalesDashboardMetrics(createMockDb(state), {
      branchId,
      year: 2026,
      month: 5,
    })

    expect(may.monthSummary.grossSales).toBe("200.00")
    expect(may.monthSummary.refunds).toBe("0.00")
    expect(may.monthSummary.netSales).toBe("200.00")
    expect(may.monthSummary.billCount).toBe(1)
  })

  it("returns zero gross for days with no sales", async () => {
    const result = await getSalesDashboardMetrics(
      createMockDb({ sales: [], refunds: [] }),
      { branchId, year: 2026, month: 6 }
    )

    expect(result.days).toHaveLength(30)
    expect(result.days.every((row) => row.grossSales === "0.00")).toBe(true)
    expect(result.days.every((row) => row.vatSales === "0.00")).toBe(true)
    expect(result.monthSummary.grossSales).toBe("0.00")
    expect(result.monthSummary.actualVat).toBe("0.00")
    expect(result.monthSummary.actualNet).toBe("0.00")
    expect(result.monthSummary.billCount).toBe(0)
  })

  it("treats null vatAmount as zero on that sale", async () => {
    const state = {
      sales: [
        {
          id: "sale-no-vat",
          branchId,
          total: new Prisma.Decimal("100.00"),
          vatAmount: null,
          status: SaleStatus.COMPLETED,
          createdAt: new Date("2026-01-05T10:00:00+07:00"),
        },
      ],
      refunds: [],
    }

    const result = await getSalesDashboardMetrics(createMockDb(state), {
      branchId,
      year: 2026,
      month: 1,
    })

    expect(result.monthSummary.grossSales).toBe("100.00")
    expect(result.monthSummary.actualVat).toBe("0.00")
    expect(result.monthSummary.actualNet).toBe("100.00")
  })
})

describe("getSalesDashboardAmountsByDayInRange", () => {
  const branchId = "branch-1"

  it("returns saleCount as completed sales within the YTD month range", async () => {
    const state = {
      sales: [
        {
          id: "jan",
          branchId,
          total: new Prisma.Decimal("100.00"),
          vatAmount: new Prisma.Decimal("6.54"),
          status: SaleStatus.COMPLETED,
          createdAt: new Date("2026-01-15T10:00:00+07:00"),
        },
        {
          id: "mar",
          branchId,
          total: new Prisma.Decimal("50.00"),
          vatAmount: new Prisma.Decimal("3.27"),
          status: SaleStatus.COMPLETED,
          createdAt: new Date("2026-03-10T10:00:00+07:00"),
        },
        {
          id: "jul-out",
          branchId,
          total: new Prisma.Decimal("80.00"),
          vatAmount: new Prisma.Decimal("5.23"),
          status: SaleStatus.COMPLETED,
          createdAt: new Date("2026-07-01T10:00:00+07:00"),
        },
      ],
      refunds: [],
    }

    const result = await getSalesDashboardAmountsByDayInRange(
      createMockDb(state),
      { branchId, year: 2026, fromMonth: 1, throughMonth: 6 }
    )

    expect(result.saleCount).toBe(2)
    expect(result.grossByDay.get("2026-01-15")?.toFixed(2)).toBe("100.00")
    expect(result.grossByDay.get("2026-03-10")?.toFixed(2)).toBe("50.00")
  })
})
