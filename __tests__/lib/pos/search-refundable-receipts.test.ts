import { Prisma, SaleStatus } from "@/generated/prisma/client"
import {
  refundableReceiptCutoff,
  searchRefundableReceipts,
} from "@/lib/pos/search-refundable-receipts"

type MockReceipt = {
  id: string
  saleId: string
  branchId: string
  receiptNo: string
  issuedAt: Date
  sale: {
    id: string
    total: Prisma.Decimal
    staffId: string | null
  }
}

type MockState = {
  receipts: MockReceipt[]
  refunds: Array<{
    saleId: string | null
    amount: Prisma.Decimal
  }>
  staff: Array<{ staffId: string; name: string }>
}

function createSearchDb(state: MockState) {
  return {
    receipt: {
      findMany: async ({
        where,
        orderBy,
        take,
      }: {
        where: {
          branchId: string
          issuedAt: { gte: Date }
          sale: { status: SaleStatus }
          receiptNo?: { contains: string; mode: "insensitive" }
        }
        orderBy: { issuedAt: "desc" }
        take: number
      }) => {
        let rows = state.receipts.filter(
          (row) =>
            row.branchId === where.branchId &&
            row.issuedAt >= where.issuedAt.gte
        )
        if (where.receiptNo?.contains) {
          const q = where.receiptNo.contains.toLowerCase()
          rows = rows.filter((row) =>
            row.receiptNo.toLowerCase().includes(q)
          )
        }
        rows.sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime())
        return rows.slice(0, take)
      },
    },
    refund: {
      groupBy: async ({
        where,
        _sum,
      }: {
        where: { saleId: { in: string[] } }
        _sum: { amount: boolean }
      }) => {
        void _sum
        const totals = new Map<string, Prisma.Decimal>()
        for (const row of state.refunds) {
          if (row.saleId && where.saleId.in.includes(row.saleId)) {
            totals.set(row.saleId, (totals.get(row.saleId) ?? new Prisma.Decimal(0)).plus(row.amount))
          }
        }
        return [...totals.entries()].map(([saleId, amount]) => ({
          saleId,
          _sum: { amount },
        }))
      },
    },
    staff: {
      findMany: async ({
        where,
      }: {
        where: { staffId: { in: string[] } }
      }) => {
        return state.staff.filter((row) => where.staffId.in.includes(row.staffId))
      },
    },
  }
}

describe("searchRefundableReceipts", () => {
  const branchId = "branch-1"
  const at = new Date("2026-06-06T12:00:00.000Z")

  it("returns newest eligible receipts first for current branch", async () => {
    const state: MockState = {
      receipts: [
        {
          id: "rcpt-old",
          saleId: "sale-old",
          branchId,
          receiptNo: "REC-OLD",
          issuedAt: new Date("2026-05-01T10:00:00.000Z"),
          sale: { id: "sale-old", total: new Prisma.Decimal("100.00"), staffId: "103" },
        },
        {
          id: "rcpt-new",
          saleId: "sale-new",
          branchId,
          receiptNo: "REC-NEW",
          issuedAt: new Date("2026-06-05T10:00:00.000Z"),
          sale: { id: "sale-new", total: new Prisma.Decimal("250.00"), staffId: "104" },
        },
        {
          id: "rcpt-other",
          saleId: "sale-other",
          branchId: "branch-2",
          receiptNo: "REC-OTHER",
          issuedAt: new Date("2026-06-05T11:00:00.000Z"),
          sale: { id: "sale-other", total: new Prisma.Decimal("50.00"), staffId: null },
        },
      ],
      refunds: [],
      staff: [
        { staffId: "103", name: "Somsak" },
        { staffId: "104", name: "Nok" },
      ],
    }

    const rows = await searchRefundableReceipts(createSearchDb(state), {
      branchId,
      at,
    })

    expect(rows.map((row) => row.receiptNo)).toEqual(["REC-NEW", "REC-OLD"])
    expect(rows[0]?.remaining).toBe("250.00")
    expect(rows[0]?.cashierDisplay).toBe("104-Nok")
  })

  it("excludes receipts older than two months", async () => {
    const cutoff = refundableReceiptCutoff(at)
    const state: MockState = {
      receipts: [
        {
          id: "rcpt-edge",
          saleId: "sale-edge",
          branchId,
          receiptNo: "REC-EDGE",
          issuedAt: new Date(cutoff.getTime()),
          sale: { id: "sale-edge", total: new Prisma.Decimal("10.00"), staffId: null },
        },
        {
          id: "rcpt-too-old",
          saleId: "sale-too-old",
          branchId,
          receiptNo: "REC-TOO-OLD",
          issuedAt: new Date(cutoff.getTime() - 1),
          sale: { id: "sale-too-old", total: new Prisma.Decimal("10.00"), staffId: null },
        },
      ],
      refunds: [],
      staff: [],
    }

    const rows = await searchRefundableReceipts(createSearchDb(state), {
      branchId,
      at,
    })

    expect(rows.map((row) => row.receiptNo)).toEqual(["REC-EDGE"])
  })

  it("filters by receipt number query", async () => {
    const state: MockState = {
      receipts: [
        {
          id: "rcpt-1",
          saleId: "sale-1",
          branchId,
          receiptNo: "REC-SH001-202606-0001",
          issuedAt: new Date("2026-06-01T10:00:00.000Z"),
          sale: { id: "sale-1", total: new Prisma.Decimal("100.00"), staffId: null },
        },
        {
          id: "rcpt-2",
          saleId: "sale-2",
          branchId,
          receiptNo: "REC-SH001-202606-0002",
          issuedAt: new Date("2026-06-02T10:00:00.000Z"),
          sale: { id: "sale-2", total: new Prisma.Decimal("200.00"), staffId: null },
        },
      ],
      refunds: [],
      staff: [],
    }

    const rows = await searchRefundableReceipts(createSearchDb(state), {
      branchId,
      at,
      query: "0002",
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.receiptNo).toBe("REC-SH001-202606-0002")
  })

  it("excludes fully refunded receipts", async () => {
    const state: MockState = {
      receipts: [
        {
          id: "rcpt-full",
          saleId: "sale-full",
          branchId,
          receiptNo: "REC-FULL",
          issuedAt: new Date("2026-06-01T10:00:00.000Z"),
          sale: { id: "sale-full", total: new Prisma.Decimal("100.00"), staffId: null },
        },
        {
          id: "rcpt-partial",
          saleId: "sale-partial",
          branchId,
          receiptNo: "REC-PARTIAL",
          issuedAt: new Date("2026-06-02T10:00:00.000Z"),
          sale: { id: "sale-partial", total: new Prisma.Decimal("100.00"), staffId: null },
        },
      ],
      refunds: [
        { saleId: "sale-full", amount: new Prisma.Decimal("100.00") },
        { saleId: "sale-partial", amount: new Prisma.Decimal("40.00") },
      ],
      staff: [],
    }

    const rows = await searchRefundableReceipts(createSearchDb(state), {
      branchId,
      at,
    })

    expect(rows.map((row) => row.receiptNo)).toEqual(["REC-PARTIAL"])
    expect(rows[0]?.alreadyRefunded).toBe("40.00")
    expect(rows[0]?.remaining).toBe("60.00")
  })
})
