import { PaymentMethod, Prisma } from "@/generated/prisma/client"
import {
  getRefundSummary,
  refundCardTotal,
  refundCashTotal,
} from "@/lib/pos/refund-summary"

function makeRefundMockPrisma(
  refunds: Array<{
    id: string
    branchId: string
    amount: string
    createdAt: Date
    sale: {
      payment: { method: PaymentMethod; amount: Prisma.Decimal } | null
    } | null
  }>
) {
  return {
    refund: {
      findMany: jest.fn(async () => refunds),
    },
  }
}

describe("getRefundSummary", () => {
  it("aggregates refund totals and tender breakdown by linked sale payment", async () => {
    const prisma = makeRefundMockPrisma([
      {
        id: "refund-1",
        branchId: "branch-1",
        amount: "40.00",
        createdAt: new Date("2026-05-10T10:00:00.000Z"),
        sale: {
          payment: {
            method: PaymentMethod.CASH,
            amount: new Prisma.Decimal("100"),
          },
        },
      },
      {
        id: "refund-2",
        branchId: "branch-1",
        amount: "15.00",
        createdAt: new Date("2026-05-11T10:00:00.000Z"),
        sale: {
          payment: {
            method: PaymentMethod.CARD,
            amount: new Prisma.Decimal("80"),
          },
        },
      },
    ])

    const result = await getRefundSummary(prisma as never, {
      branchId: "branch-1",
    })

    expect(result.refundCount).toBe(2)
    expect(result.refundTotal).toBe("55")
    expect(refundCashTotal(result.paymentBreakdown)).toBe("40")
    expect(refundCardTotal(result.paymentBreakdown)).toBe("15")
    expect(result.missingPaymentCount).toBe(0)
  })

  it("counts refunds missing linked sale payment separately", async () => {
    const prisma = makeRefundMockPrisma([
      {
        id: "refund-1",
        branchId: "branch-1",
        amount: "10.00",
        createdAt: new Date("2026-05-10T10:00:00.000Z"),
        sale: null,
      },
    ])

    const result = await getRefundSummary(prisma as never, {})

    expect(result.refundTotal).toBe("10")
    expect(result.paymentBreakdown).toHaveLength(0)
    expect(result.missingPaymentCount).toBe(1)
  })
})
