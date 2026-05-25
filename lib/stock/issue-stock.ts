import type { Prisma } from "@/generated/prisma/client"
import { Prisma as PrismaNS } from "@/generated/prisma/client"
import { assertProductId, parsePositiveQtyOrSkip } from "./stock-errors"
import { consumeStockLayersFifo } from "./layers"
import { toDec } from "./decimal"
import type { ApplyLineContext, ApplyLineResult, StockMoveItem } from "./transaction-types"

export async function applyIssueItem(
  tx: Prisma.TransactionClient,
  ctx: ApplyLineContext,
  raw: StockMoveItem
): Promise<ApplyLineResult> {
  const qty = parsePositiveQtyOrSkip(raw.qty, "issueStock")
  if (qty === null) return "skipped"

  const productId = assertProductId(raw.productId, "issueStock")
  const refLineId = String(raw.lineId ?? `${ctx.refId}-${productId}`)

  const existingStock = await tx.stock.findUnique({
    where: { branchId_productId: { branchId: ctx.branchId, productId } },
  })

  const beforeQty = existingStock?.qty ?? 0
  const beforeAvg = toDec(existingStock?.avgCost ?? 0)
  const beforeValue = beforeAvg.mul(new PrismaNS.Decimal(beforeQty))

  const { unitCost } = await consumeStockLayersFifo(tx, {
    branchId: ctx.branchId,
    productId,
    qty,
    fallbackUnitCost: beforeAvg,
  })

  const afterQty = beforeQty - qty
  const afterAvg = beforeAvg
  const afterValue = afterAvg.mul(new PrismaNS.Decimal(afterQty))

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
      qtyIn: 0,
      qtyOut: qty,
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