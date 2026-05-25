import type { Prisma } from "@/generated/prisma/client"
import { Prisma as PrismaNS } from "@/generated/prisma/client"
import { toDec } from "./decimal"

export type CreateLayerInput = {
  branchId: string
  productId: string
  qty: number
  unitCost: Prisma.Decimal
  refType: string
  refId: string
}

/** Create one FIFO cost layer (inbound). */
export async function createStockLayer(
  tx: Prisma.TransactionClient,
  input: CreateLayerInput
) {
  return tx.stockLayer.create({
    data: {
      branchId: input.branchId,
      productId: input.productId,
      qty: input.qty,
      qtyRemain: input.qty,
      unitCost: input.unitCost,
      refType: input.refType,
      refId: input.refId,
    },
  })
}

export type ConsumeLayersResult = {
  totalCost: Prisma.Decimal
  unitCost: Prisma.Decimal
}

/**
 * FIFO consume layers by createdAt ascending.
 * Remainder valued at fallbackUnitCost (typically Stock.avgCost).
 */
export async function consumeStockLayersFifo(
  tx: Prisma.TransactionClient,
  args: {
    branchId: string
    productId: string
    qty: number
    fallbackUnitCost: Prisma.Decimal
  }
): Promise<ConsumeLayersResult> {
  const need = args.qty
  let remaining = need
  let consumedValue = toDec(0)

  const layers = await tx.stockLayer.findMany({
    where: {
      branchId: args.branchId,
      productId: args.productId,
      qtyRemain: { gt: 0 },
    },
    orderBy: { createdAt: "asc" },
  })

  for (const layer of layers) {
    if (remaining <= 0) break
    const take = Math.min(layer.qtyRemain, remaining)
    consumedValue = consumedValue.plus(
      toDec(layer.unitCost).mul(new PrismaNS.Decimal(take))
    )
    await tx.stockLayer.update({
      where: { id: layer.id },
      data: { qtyRemain: { decrement: take } },
    })
    remaining -= take
  }

  if (remaining > 0) {
    consumedValue = consumedValue.plus(
      args.fallbackUnitCost.mul(new PrismaNS.Decimal(remaining))
    )
  }

  const unitCost =
    need > 0 ? consumedValue.div(new PrismaNS.Decimal(need)) : toDec(0)

  return { totalCost: consumedValue, unitCost }
}