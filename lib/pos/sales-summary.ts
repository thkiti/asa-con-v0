import { Prisma, SaleStatus } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import { normalizeDateRange } from "@/lib/reporting/date-range"
import type {
  CashierSummaryEntry,
  PaymentBreakdownEntry,
  ProductTypeBreakdownEntry,
  SalesSummaryFilter,
  SalesSummaryResult,
} from "@/lib/reporting/report-types"
import { toDec, ZERO } from "@/lib/stock/decimal"

export type SalesSummaryPrisma = Pick<PrismaClient, "sale">

export async function getSalesSummary(
  prisma: SalesSummaryPrisma,
  filter: SalesSummaryFilter = {}
): Promise<SalesSummaryResult> {
  const where: Prisma.SaleWhereInput = {
    status: SaleStatus.COMPLETED,
  }

  if (filter.branchId) where.branchId = filter.branchId
  if (filter.from != null && filter.to != null) {
    const range = normalizeDateRange({ from: filter.from, to: filter.to })
    where.createdAt = { gte: range.start, lt: range.endExclusive }
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      items: true,
      payment: true,
      receipt: true,
    },
    orderBy: { createdAt: "asc" },
  })

  let revenue = ZERO
  const paymentMap = new Map<string, PaymentBreakdownEntry>()
  const cashierMap = new Map<string, CashierSummaryEntry>()
  const productTypeMap = new Map<string, ProductTypeBreakdownEntry>()

  for (const sale of sales) {
    let saleRevenue = ZERO
    for (const item of sale.items) {
      const lineTotal = toDec(item.lineTotal)
      saleRevenue = saleRevenue.plus(lineTotal)
      revenue = revenue.plus(lineTotal)

      const ptKey = item.productType
      const ptExisting = productTypeMap.get(ptKey)
      if (ptExisting) {
        ptExisting.lineCount += 1
        ptExisting.qty += item.qty
        ptExisting.revenue = toDec(ptExisting.revenue).plus(lineTotal).toString()
      } else {
        productTypeMap.set(ptKey, {
          productType: item.productType,
          lineCount: 1,
          qty: item.qty,
          revenue: lineTotal.toString(),
        })
      }
    }

    if (sale.payment) {
      const method = sale.payment.method
      const payExisting = paymentMap.get(method)
      const amount = toDec(sale.payment.amount)
      if (payExisting) {
        payExisting.saleCount += 1
        payExisting.amount = toDec(payExisting.amount).plus(amount).toString()
      } else {
        paymentMap.set(method, {
          method,
          amount: amount.toString(),
          saleCount: 1,
        })
      }
    }

    const cashierKey = sale.staffId ?? "__none__"
    const cashierExisting = cashierMap.get(cashierKey)
    if (cashierExisting) {
      cashierExisting.saleCount += 1
      cashierExisting.revenue = toDec(cashierExisting.revenue)
        .plus(saleRevenue)
        .toString()
    } else {
      cashierMap.set(cashierKey, {
        staffId: sale.staffId,
        saleCount: 1,
        revenue: saleRevenue.toString(),
      })
    }
  }

  return {
    saleCount: sales.length,
    revenue: revenue.toString(),
    paymentBreakdown: [...paymentMap.values()],
    cashierSummary: [...cashierMap.values()],
    productTypeBreakdown: [...productTypeMap.values()],
  }
}
