import { Prisma, ProductType } from "@/generated/prisma/client"
import { getFifoValuation } from "@/lib/stock/valuation"
import { getStockSummary } from "@/lib/stock/summary"
import {
  createEmptyMockReportingState,
  createMockReportingPrisma,
} from "./mock-reporting-prisma"

describe("valuation policy", () => {
  it("keeps AVG_COST stock summary separate from FIFO layer valuation", async () => {
    const state = createEmptyMockReportingState()
    state.stocks.push({
      branchId: "b1",
      productId: "p1",
      qty: 5,
      avgCost: new Prisma.Decimal("10"),
      product: {
        code: "T1",
        name: "Tracked",
        productType: ProductType.TRACKED,
        deleted: false,
      },
      branch: { name: "Shop" },
    })
    state.stockLayers.push({
      branchId: "b1",
      productId: "p1",
      qtyRemain: 5,
      unitCost: new Prisma.Decimal("12"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      product: { productType: ProductType.TRACKED, deleted: false },
    })

    const prisma = createMockReportingPrisma(state)
    const avg = await getStockSummary(prisma, { branchId: "b1" })
    const fifo = await getFifoValuation(prisma, { branchId: "b1" })

    expect(avg.valuationMethod).toBe("AVG_COST")
    expect(avg.totals.totalValue).toBe("50")
    expect(fifo.valuationMethod).toBe("FIFO")
    expect(fifo.totals.fifoValue).toBe("60")
  })
})

