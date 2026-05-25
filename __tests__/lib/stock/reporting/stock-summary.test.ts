import { Prisma, ProductType } from "@/generated/prisma/client"
import { getStockSummary } from "@/lib/stock/summary"
import {
  createEmptyMockReportingState,
  createMockReportingPrisma,
} from "../../reporting/mock-reporting-prisma"

describe("getStockSummary", () => {
  it("values negative qty without clamping (qty * avgCost)", async () => {
    const state = createEmptyMockReportingState()
    state.stocks.push({
      branchId: "b1",
      productId: "p1",
      qty: -3,
      avgCost: new Prisma.Decimal("10"),
      product: {
        code: "T1",
        name: "Tracked",
        productType: ProductType.TRACKED,
        deleted: false,
      },
      branch: { name: "Shop" },
    })

    const prisma = createMockReportingPrisma(state)
    const result = await getStockSummary(prisma, { branchId: "b1", includeZeroQty: true })

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].totalValue).toBe("-30")
    expect(result.totals.totalValue).toBe("-30")
  })

  it("includes TRACKED by default and excludes CONSUMABLE unless includeNonTracked", async () => {
    const state = createEmptyMockReportingState()
    const base = {
      branchId: "b1",
      qty: 2,
      avgCost: new Prisma.Decimal("5"),
      branch: { name: "Shop" },
    }
    state.stocks.push(
      {
        ...base,
        productId: "tracked",
        product: {
          code: "TR",
          name: "Tracked",
          productType: ProductType.TRACKED,
          deleted: false,
        },
      },
      {
        ...base,
        productId: "consumable",
        product: {
          code: "CO",
          name: "Consumable",
          productType: ProductType.CONSUMABLE,
          deleted: false,
        },
      }
    )

    const prisma = createMockReportingPrisma(state)
    const trackedOnly = await getStockSummary(prisma, { branchId: "b1" })
    expect(trackedOnly.rows.map((r) => r.productId)).toEqual(["tracked"])

    const all = await getStockSummary(prisma, {
      branchId: "b1",
      includeNonTracked: true,
    })
    expect(all.rows.map((r) => r.productId).sort()).toEqual(["consumable", "tracked"])
  })
})
