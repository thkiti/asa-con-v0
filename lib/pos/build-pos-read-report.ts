import { SaleStatus, type PrismaClient } from "@/generated/prisma/client"
import {
  aggregatePosCollectCashBySalesDate,
  aggregatePaymentAndTotals,
  aggregatePosDailyReadReportFromSales,
  computeReadReportNetTotal,
  summarizeRefundsForReadReport,
} from "@/lib/pos/aggregatePosReadReport"
import {
  loadConfiguredManagementHeaderCodes,
  loadSummaryHeaderLabels,
  POLICY_SUMMARY_HEADERS,
  resolveReadReportDisplayCatalog,
  type ReferenceProductGroupRow,
} from "@/lib/product-groups/management-product-group"
import {
  bangkokCalendarYmd,
  readZMonthStartYmd,
  utcRangeForBangkokCalendarDay,
  utcRangeForBangkokInclusiveYmdRange,
} from "@/lib/pos/bangkokDayBounds"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

export { readZMonthStartYmd } from "@/lib/pos/bangkokDayBounds"

type ReadReportPrisma = Pick<
  PrismaClient,
  "sale" | "product" | "refund" | "referenceStock"
>

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

async function loadReferenceStockByProductIds(
  prisma: ReadReportPrisma,
  productIds: string[]
): Promise<Map<string, ReferenceProductGroupRow[]>> {
  if (productIds.length === 0) return new Map()

  const rows = await prisma.referenceStock.findMany({
    where: { productId: { in: productIds }, deleted: false },
    select: { productId: true, productGroup: true },
  })

  const map = new Map<string, ReferenceProductGroupRow[]>()
  for (const row of rows) {
    const list = map.get(row.productId) ?? []
    list.push({ productGroup: row.productGroup })
    map.set(row.productId, list)
  }
  return map
}

/** READ X / READ Z — single Bangkok calendar day, read-only */
export async function buildPosDailyReadReport(
  prisma: ReadReportPrisma,
  opts: {
    branchId: string
    branchCode: string
    branchName: string
    staffId: string
    staffName: string
    mode: "X" | "Z"
    /** Defaults to today (Bangkok). HO review may pass another day for Z. */
    bangkokDate?: string
  }
): Promise<ReadReportPayload> {
  const ymd = opts.bangkokDate ?? bangkokCalendarYmd(new Date())
  return buildPosReadReportForBangkokRange(prisma, {
    ...opts,
    startYmd: ymd,
    endYmd: ymd,
    readZScope: opts.mode === "Z" ? "daily" : undefined,
    readZViewDate: opts.mode === "Z" ? ymd : undefined,
    bangkokDateLabel: ymd,
  })
}

/** READ Z HO review — cumulative month-to-date through endYmd (Bangkok calendar). */
export async function buildPosReadZCumulativeToDateReport(
  prisma: ReadReportPrisma,
  opts: {
    branchId: string
    branchCode: string
    branchName: string
    staffId: string
    staffName: string
    endYmd: string
  }
): Promise<ReadReportPayload> {
  const monthStart = readZMonthStartYmd(opts.endYmd)
  return buildPosReadReportForBangkokRange(prisma, {
    branchId: opts.branchId,
    branchCode: opts.branchCode,
    branchName: opts.branchName,
    staffId: opts.staffId,
    staffName: opts.staffName,
    mode: "Z",
    startYmd: monthStart,
    endYmd: opts.endYmd,
    readZScope: "cumulative-to-date",
    readZViewDate: opts.endYmd,
    bangkokDateFrom: monthStart,
    bangkokDateTo: opts.endYmd,
    bangkokDateLabel: `${monthStart} – ${opts.endYmd}`,
  })
}

async function buildPosReadReportForBangkokRange(
  prisma: ReadReportPrisma,
  opts: {
    branchId: string
    branchCode: string
    branchName: string
    staffId: string
    staffName: string
    mode: "X" | "Z"
    startYmd: string
    endYmd: string
    readZScope?: "daily" | "cumulative-to-date"
    readZViewDate?: string
    bangkokDateFrom?: string
    bangkokDateTo?: string
    bangkokDateLabel: string
  }
): Promise<ReadReportPayload> {
  const { start, endExclusive } = utcRangeForBangkokInclusiveYmdRange(
    opts.startYmd,
    opts.endYmd
  )

  const configuredHeaders = await loadConfiguredManagementHeaderCodes(prisma)
  const displayCatalog = resolveReadReportDisplayCatalog(
    POLICY_SUMMARY_HEADERS,
    configuredHeaders
  )

  const [sales, refunds, labels] = await Promise.all([
    loadSalesForReadReport(prisma, opts.branchId, start, endExclusive),
    loadRefundsForReadReport(prisma, opts.branchId, start, endExclusive),
    loadSummaryHeaderLabels(prisma, displayCatalog),
  ])
  const products = await loadProductsForSales(prisma, sales)
  const productIds = [
    ...new Set(sales.flatMap((s) => s.items.map((i) => i.productId))),
  ]
  const refByProductId = await loadReferenceStockByProductIds(prisma, productIds)
  const { groupLines, paymentLines, grandTotal, saleCount } =
    aggregatePosDailyReadReportFromSales(
      sales,
      products,
      labels,
      displayCatalog,
      refByProductId
    )
  const { refundCount, refundTotal } = summarizeRefundsForReadReport(refunds)
  const netTotal = computeReadReportNetTotal(grandTotal, refundTotal)

  return {
    mode: opts.mode,
    bangkokDate: opts.bangkokDateLabel,
    bangkokDateFrom: opts.bangkokDateFrom,
    bangkokDateTo: opts.bangkokDateTo,
    readZScope: opts.readZScope,
    readZViewDate: opts.readZViewDate,
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
  const { dailyCashLines, grandTotal, saleCount } =
    aggregatePosCollectCashBySalesDate(sales)
  const { paymentLines, grandTotal: totalSales } = aggregatePaymentAndTotals(sales)

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
    groupLines: [],
    paymentLines,
    dailyCashLines,
    grandTotal,
    saleCount,
    refundCount: 0,
    refundTotal: 0,
    netTotal: totalSales,
    monthlySubtotals: null,
  }
}

export function validateReadZBangkokDate(ymd: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return "bangkokDate must be YYYY-MM-DD"
  }
  try {
    utcRangeForBangkokCalendarDay(ymd)
  } catch {
    return "Invalid bangkokDate"
  }
  return null
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
