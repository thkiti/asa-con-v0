import { Prisma } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import { participatesInLedgerAtSale } from "@/lib/products/product-type-rules"
import type {
  StockSummaryFilter,
  StockSummaryResult,
  StockSummaryRow,
} from "@/lib/reporting/report-types"
import { toDec, ZERO } from "./decimal"

export type StockSummaryPrisma = Pick<PrismaClient, "stock">

export async function queryStockSummary(
  prisma: StockSummaryPrisma,
  filter: StockSummaryFilter = {}
): Promise<StockSummaryResult> {
  const where: Prisma.StockWhereInput = {
    product: { deleted: false },
  }

  if (filter.branchId) where.branchId = filter.branchId
  if (filter.productId) where.productId = filter.productId
  if (!filter.includeZeroQty) where.qty = { not: 0 }

  const stocks = await prisma.stock.findMany({
    where,
    include: {
      product: {
        select: {
          code: true,
          name: true,
          productType: true,
        },
      },
      branch: { select: { name: true } },
    },
    orderBy: [{ branchId: "asc" }, { productId: "asc" }],
  })

  const rows: StockSummaryRow[] = []
  let totalQty = 0
  let totalValue = ZERO

  for (const stock of stocks) {
    if (
      !filter.includeNonTracked &&
      !participatesInLedgerAtSale(stock.product.productType)
    ) {
      continue
    }

    const avgCost = toDec(stock.avgCost)
    const lineValue = avgCost.mul(new Prisma.Decimal(stock.qty))
    totalQty += stock.qty
    totalValue = totalValue.plus(lineValue)

    rows.push({
      branchId: stock.branchId,
      branchName: stock.branch.name,
      productId: stock.productId,
      productCode: stock.product.code,
      productName: stock.product.name,
      productType: stock.product.productType,
      qty: stock.qty,
      avgCost: avgCost.toString(),
      totalValue: lineValue.toString(),
    })
  }

  return {
    valuationMethod: "AVG_COST",
    rows,
    totals: {
      qty: totalQty,
      totalValue: totalValue.toString(),
    },
  }
}

export async function getStockSummary(
  prisma: StockSummaryPrisma,
  filter?: StockSummaryFilter
): Promise<StockSummaryResult> {
  return queryStockSummary(prisma, filter)
}
