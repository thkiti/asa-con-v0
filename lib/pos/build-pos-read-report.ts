import { SaleStatus, type PrismaClient } from "@/generated/prisma/client"
import {
  aggregatePosReadReportFromSales,
  computeReadReportNetTotal,
  summarizeRefundsForReadReport,
} from "@/lib/pos/aggregatePosReadReport"
import {
  bangkokCalendarYm,
  bangkokCalendarYmd,
  utcRangeForBangkokCalendarDay,
  utcRangeForBangkokInclusiveYmdRange,
} from "@/lib/pos/bangkokDayBounds"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

type ReadReportPrisma = Pick<PrismaClient, "sale" | "product" | "refund">

async function loadSalesForReadReport(
  prisma: ReadReportPrisma,
  branchId: string,
  start: Date,
  endExclusive: Date
) {
  return prisma.sale.findMany({
    where: {
      branchId,
      status: SaleStatus.COMPLETED,
      createdAt: { gte: start, lt: endExclusive },
    },
    include: {
      items: true,
      payment: true,
    },
  })
}

async function loadRefundsForReadReport(
  prisma: ReadReportPrisma,
  branchId: string,
  start: Date,
  endExclusive: Date
) {
  return prisma.refund.findMany({
    where: {
      branchId,
      createdAt: { gte: start, lt: endExclusive },
    },
    select: { amount: true },
  })
}

async function loadProductsForSales(
  prisma: ReadReportPrisma,
  sales: Awaited<ReturnType<typeof loadSalesForReadReport>>
) {
  const productIds = [
    ...new Set(sales.flatMap((s) => s.items.map((i) => i.productId))),
  ]
  if (productIds.length === 0) return []
  return prisma.product.findMany({
    where: { id: { in: productIds }, deleted: false },
  })
}

/** READ X / READ Z — วันนี้ (ปฏิทินกรุงเทพ), read-only */
export async function buildPosDailyReadReport(
  prisma: ReadReportPrisma,
  opts: {
    branchId: string
    branchCode: string
    branchName: string
    staffId: string
    staffName: string
    mode: "X" | "Z"
  }
): Promise<ReadReportPayload> {
  const ymd = bangkokCalendarYmd(new Date())
  const { start, endExclusive } = utcRangeForBangkokCalendarDay(ymd)

  const [sales, refunds] = await Promise.all([
    loadSalesForReadReport(prisma, opts.branchId, start, endExclusive),
    loadRefundsForReadReport(prisma, opts.branchId, start, endExclusive),
  ])
  const products = await loadProductsForSales(prisma, sales)
  const { groupLines, paymentLines, grandTotal, saleCount } =
    aggregatePosReadReportFromSales(sales, products)
  const { refundCount, refundTotal } = summarizeRefundsForReadReport(refunds)
  const netTotal = computeReadReportNetTotal(grandTotal, refundTotal)

  return {
    mode: opts.mode,
    bangkokDate: ymd,
    generatedAt: new Date().toISOString(),
    staffId: opts.staffId,
    staffName: opts.staffName,
    branchCode: opts.branchCode,
    branchName: opts.branchName,
    groupLines,
    paymentLines,
    grandTotal,
    saleCount,
    refundCount,
    refundTotal,
    netTotal,
  }
}

const MAX_COLLECT_DAYS = 31

/** COLLECTOR — ช่วงวันที่ปฏิทินกรุงเทพ, read-only */
export async function buildPosCollectReport(
  prisma: ReadReportPrisma,
  opts: {
    branchId: string
    branchCode: string
    branchName: string
    staffId: string
    staffName: string
    dateFrom: string
    dateTo: string
  }
): Promise<ReadReportPayload> {
  const { start, endExclusive } = utcRangeForBangkokInclusiveYmdRange(
    opts.dateFrom,
    opts.dateTo
  )

  const sales = await loadSalesForReadReport(
    prisma,
    opts.branchId,
    start,
    endExclusive
  )
  const products = await loadProductsForSales(prisma, sales)
  const { groupLines, paymentLines, grandTotal, saleCount } =
    aggregatePosReadReportFromSales(sales, products)

  const monthTotals = new Map<string, { grandTotal: number; saleCount: number }>()
  for (const sale of sales) {
    const ym = bangkokCalendarYm(sale.createdAt)
    const cur = monthTotals.get(ym) ?? { grandTotal: 0, saleCount: 0 }
    cur.grandTotal += Number(sale.total)
    cur.saleCount += 1
    monthTotals.set(ym, cur)
  }
  const monthlySubtotals =
    monthTotals.size > 1
      ? [...monthTotals.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, v]) => ({
            month,
            grandTotal: Math.round(v.grandTotal * 100) / 100,
            saleCount: v.saleCount,
          }))
      : null

  return {
    mode: "COLLECT",
    bangkokDate: `${opts.dateFrom} – ${opts.dateTo}`,
    bangkokDateFrom: opts.dateFrom,
    bangkokDateTo: opts.dateTo,
    generatedAt: new Date().toISOString(),
    staffId: opts.staffId,
    staffName: opts.staffName,
    branchCode: opts.branchCode,
    branchName: opts.branchName,
    groupLines,
    paymentLines,
    grandTotal,
    saleCount,
    refundCount: 0,
    refundTotal: 0,
    netTotal: grandTotal,
    monthlySubtotals,
  }
}

export function validateCollectDateRange(dateFrom: string, dateTo: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    return "dateFrom/dateTo must be YYYY-MM-DD"
  }
  if (dateFrom > dateTo) {
    return "dateFrom must be on or before dateTo"
  }
  const { start } = utcRangeForBangkokCalendarDay(dateFrom)
  const { endExclusive } = utcRangeForBangkokCalendarDay(dateTo)
  const span = Math.round(
    (endExclusive.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
  )
  if (span === 0 || span > MAX_COLLECT_DAYS) {
    return `ช่วงวันต้องมี 1–${MAX_COLLECT_DAYS} วัน (ปฏิทินกรุงเทพ)`
  }
  return null
}
