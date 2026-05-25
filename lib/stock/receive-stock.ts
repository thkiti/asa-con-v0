import type { Prisma } from "@/generated/prisma/client"
import { Prisma as PrismaNS } from "@/generated/prisma/client"
import { assertProductId, parsePositiveQtyOrSkip } from "./stock-errors"
import { createStockLayer } from "./layers"
import { inboundMovingAverage, toDec } from "./decimal"
import type { ApplyLineContext, ApplyLineResult, StockMoveItem } from "./transaction-types"

export async function applyReceiveItem(
  tx: Prisma.TransactionClient,
  ctx: ApplyLineContext,
  raw: StockMoveItem
): Promise<ApplyLineResult> {
  const qty = parsePositiveQtyOrSkip(raw.qty, "receiveStock")
  if (qty === null) return "skipped"

  const productId = assertProductId(raw.productId, "receiveStock")
  const refLineId = String(raw.lineId ?? `${ctx.refId}-${productId}`)

  const existingStock = await tx.stock.findUnique({
    where: { branchId_productId: { branchId: ctx.branchId, productId } },
  })

  const beforeQty = existingStock?.qty ?? 0
  const beforeAvg = toDec(existingStock?.avgCost ?? 0)
  const beforeValue = beforeAvg.mul(new PrismaNS.Decimal(beforeQty))

  const unitCost = raw.unitCost !== undefined ? toDec(raw.unitCost) : beforeAvg
  const afterQty = beforeQty + qty
  const afterAvg = inboundMovingAverage(beforeQty, beforeAvg, qty, unitCost)
  const afterValue = afterAvg.mul(new PrismaNS.Decimal(afterQty))

  await createStockLayer(tx, {
    branchId: ctx.branchId,
    productId,
    qty,
    unitCost,
    refType: ctx.refType,
    refId: ctx.refId,
  })

  if (existingStock) {
    await tx.stock.update({
      where: { branchId_productId: { branchId: ctx.branchId, productId } },
      data: { qty: afterQty, avgCost: afterAvg },
    })
  } else {
    await tx.stock.create({
      data: {
        branchId: ctx.branchId,
        productId,
        qty: afterQty,
        avgCost: afterAvg,
      },
    })
  }

  await tx.stockTransaction.create({
    data: {
      branchId: ctx.branchId,
      productId,
      date: ctx.date,
      qtyIn: qty,
      qtyOut: 0,
      unitCost,
      beforeQty,
      afterQty,
      beforeValue,
      afterValue,
      refType: ctx.refType,
      refId: ctx.refId,
      refLineId,
      documentId: ctx.documentId,
    },
  })

  return "applied"
}