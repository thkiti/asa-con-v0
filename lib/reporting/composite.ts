import { normalizeDayRange } from "./date-range"
import type {
  DailyBranchSummary,
  DailyBranchSummaryFilter,
  SalesSummaryResult,
  StockSummaryResult,
} from "./report-types"
import { getSalesSummary } from "@/lib/pos/sales-summary"
import { getStockSummary } from "@/lib/stock/summary"
import type { PrismaClient } from "@/generated/prisma/client"

export type DailyBranchPrisma = Pick<PrismaClient, "stock" | "sale">

export function mergeDailyBranchSummary(input: {
  branchId: string
  day: string
  stock: StockSummaryResult
  sales: SalesSummaryResult
}): DailyBranchSummary {
  return {
    branchId: input.branchId,
    day: input.day,
    stock: {
      valuationMethod: input.stock.valuationMethod,
      totals: input.stock.totals,
    },
    sales: {
      saleCount: input.sales.saleCount,
      revenue: input.sales.revenue,
    },
  }
}

export async function getDailyBranchSummary(
  prisma: DailyBranchPrisma,
  filter: DailyBranchSummaryFilter
): Promise<DailyBranchSummary> {
  const dayRange = normalizeDayRange(filter.day)
  const day = dayRange.start.toISOString().slice(0, 10)

  const [stock, sales] = await Promise.all([
    getStockSummary(prisma, { branchId: filter.branchId }),
    getSalesSummary(prisma, {
      branchId: filter.branchId,
      from: filter.day,
      to: filter.day,
    }),
  ])

  return mergeDailyBranchSummary({
    branchId: filter.branchId,
    day,
    stock,
    sales,
  })
}
