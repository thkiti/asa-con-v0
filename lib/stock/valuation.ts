import { Prisma, ProductType } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import type {
  FifoValuationFilter,
  FifoValuationResult,
  FifoValuationRow,
} from "@/lib/reporting/report-types"
import { toDec, ZERO } from "./decimal"

export type FifoValuationPrisma = Pick<PrismaClient, "stockLayer">

export async function getFifoValuation(
  prisma: FifoValuationPrisma,
  filter: FifoValuationFilter = {}
): Promise<FifoValuationResult> {
  const where: Prisma.StockLayerWhereInput = {
    qtyRemain: { gt: 0 },
    product: { productType: ProductType.TRACKED, deleted: false },
  }
  if (filter.branchId) where.branchId = filter.branchId
  if (filter.productId) where.productId = filter.productId

  const layers = await prisma.stockLayer.findMany({
    where,
    select: {
      branchId: true,
      productId: true,
      qtyRemain: true,
      unitCost: true,
    },
    orderBy: [{ branchId: "asc" }, { productId: "asc" }, { createdAt: "asc" }],
  })

  const byKey = new Map<string, FifoValuationRow>()
  let totalQty = 0
  let totalValue = ZERO

  for (const layer of layers) {
    const key = `${layer.branchId}:${layer.productId}`
    const unitCost = toDec(layer.unitCost)
    const lineValue = unitCost.mul(new Prisma.Decimal(layer.qtyRemain))

    const existing = byKey.get(key)
    if (existing) {
      existing.fifoQty += layer.qtyRemain
      existing.fifoValue = toDec(existing.fifoValue).plus(lineValue).toString()
    } else {
      byKey.set(key, {
        branchId: layer.branchId,
        productId: layer.productId,
        fifoQty: layer.qtyRemain,
        fifoValue: lineValue.toString(),
      })
    }

    totalQty += layer.qtyRemain
    totalValue = totalValue.plus(lineValue)
  }

  return {
    valuationMethod: "FIFO",
    rows: [...byKey.values()],
    totals: {
      fifoQty: totalQty,
      fifoValue: totalValue.toString(),
    },
  }
}
