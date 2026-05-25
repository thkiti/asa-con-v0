import { PaymentMethod, ProductType, SaleStatus } from "@/generated/prisma/client"
import { Prisma } from "@/generated/prisma/client"
import { getSalesSummary } from "@/lib/pos/sales-summary"
import {
  createEmptyMockReportingState,
  createMockReportingPrisma,
} from "../../reporting/mock-reporting-prisma"

describe("getSalesSummary", () => {
  it("aggregates revenue from sale items and never reads stock", async () => {
    const state = createEmptyMockReportingState()
    state.sales.push({
      branchId: "b1",
      staffId: "s1",
      status: SaleStatus.COMPLETED,
      items: [
        {
          productType: ProductType.TRACKED,
          qty: 4,
          lineTotal: new Prisma.Decimal("40"),
        },
        {
          productType: ProductType.CONSUMABLE,
          qty: 99,
          lineTotal: new Prisma.Decimal("10"),
        },
      ],
      payment: {
        method: PaymentMethod.CASH,
        amount: new Prisma.Decimal("50"),
      },
      receipt: { saleId: "sale-1" },
    })

    const prisma = createMockReportingPrisma(state)
    const result = await getSalesSummary(prisma, { branchId: "b1" })

    expect(prisma.stock.findMany).not.toHaveBeenCalled()
    expect(result.revenue).toBe("50")
    expect(result.productTypeBreakdown.find((p) => p.productType === ProductType.TRACKED)?.qty).toBe(4)
    expect(result.productTypeBreakdown.find((p) => p.productType === ProductType.CONSUMABLE)?.qty).toBe(99)
  })
})
