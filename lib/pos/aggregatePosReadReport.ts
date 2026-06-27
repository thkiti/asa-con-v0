import type { PaymentMethod, Product } from "@/generated/prisma/client"
import { bangkokCalendarYmd } from "@/lib/pos/bangkokDayBounds"
import {
  mergeManagementGroupSummary,
  resolveConfiguredProductGroup,
  resolveReadReportAggregateKey,
  type ReferenceProductGroupRow,
  type SummaryHeaderLabel,
} from "@/lib/product-groups/management-product-group"
import {
  READ_REPORT_PAYMENT_LABEL,
  READ_REPORT_PAYMENT_ORDER,
  readReportPaymentBucket,
} from "@/lib/pos/readReportPayment"

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function pad3(n: number) {
  return String(n).padStart(3, "0")
}

interface GroupAgg {
  qty: number
  amount: number
  sampleName: string
}

export type SaleRowForReadReport = {
  total: unknown
  payment: { method: PaymentMethod } | null
  items: Array<{
    productId: string
    qty: unknown
    lineTotal: unknown
  }>
}

export type ReadReportGroupLine = {
  lineKey: string
  displayLeft: string
  qty: number
  amount: number
}

export type ReadReportPaymentLine = {
  key: string
  label: string
  amount: number
}

export type ReadReportCollectDailyCashLine = {
  /** Bangkok calendar sales date YYYY-MM-DD */
  salesDateYmd: string
  cashAmount: number
  ticketCount: number
}

function isCashSale(sale: SaleRowForReadReport): boolean {
  return (sale.payment?.method ?? "CASH") === "CASH"
}

function formatReadReportGroupDisplayLeft(
  headerCode: string,
  label: string | null
): string {
  const name = label?.trim() || headerCode
  const nameShort = name.length > 22 ? `${name.slice(0, 20)}…` : name
  return `${headerCode}-${nameShort}`
}

export function aggregatePaymentAndTotals(sales: SaleRowForReadReport[]) {
  const paymentTotals: Record<string, number> = {}
  for (const k of READ_REPORT_PAYMENT_ORDER) paymentTotals[k] = 0

  let grandTotal = 0
  for (const sale of sales) {
    const t = Number(sale.total)
    grandTotal += t
    const method = sale.payment?.method ?? "CASH"
    const bucket = readReportPaymentBucket(method)
    paymentTotals[bucket] = (paymentTotals[bucket] ?? 0) + t
  }
  grandTotal = Math.round(grandTotal * 100) / 100

  const paymentLines = READ_REPORT_PAYMENT_ORDER.map((key) => ({
    key,
    label: READ_REPORT_PAYMENT_LABEL[key],
    amount: Math.round((paymentTotals[key] ?? 0) * 100) / 100,
  }))

  return { paymentLines, grandTotal, saleCount: sales.length }
}

/** COLLECTOR — daily CASH totals by Bangkok sales date (no product groups). */
export function aggregatePosCollectCashBySalesDate(
  sales: Array<SaleRowForReadReport & { createdAt: Date }>
): {
  dailyCashLines: ReadReportCollectDailyCashLine[]
  grandTotal: number
  saleCount: number
} {
  const byDate = new Map<string, { cashAmount: number; ticketCount: number }>()

  for (const sale of sales) {
    if (!isCashSale(sale)) continue
    const ymd = bangkokCalendarYmd(sale.createdAt)
    const cur = byDate.get(ymd) ?? { cashAmount: 0, ticketCount: 0 }
    cur.cashAmount += Number(sale.total)
    cur.ticketCount += 1
    byDate.set(ymd, cur)
  }

  const dailyCashLines = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([salesDateYmd, v]) => ({
      salesDateYmd,
      cashAmount: Math.round(v.cashAmount * 100) / 100,
      ticketCount: v.ticketCount,
    }))

  const grandTotal =
    Math.round(dailyCashLines.reduce((sum, row) => sum + row.cashAmount, 0) * 100) /
    100
  const saleCount = dailyCashLines.reduce((sum, row) => sum + row.ticketCount, 0)

  return { dailyCashLines, grandTotal, saleCount }
}

/** READ X/Z — dynamic display catalog (900 parent or 901/902 children), zero-filled. */
export function aggregatePosDailyReadReportFromSales(
  sales: SaleRowForReadReport[],
  products: Pick<
    Product,
    "id" | "name" | "groupCode" | "typeCode" | "runningCode" | "code"
  >[],
  labels: ReadonlyMap<string, SummaryHeaderLabel>,
  displayCatalog: readonly string[],
  refByProductId?: ReadonlyMap<string, readonly ReferenceProductGroupRow[]>
): {
  groupLines: ReadReportGroupLine[]
  paymentLines: ReadReportPaymentLine[]
  grandTotal: number
  saleCount: number
} {
  const productById = new Map(products.map((p) => [p.id, p]))
  const displayCatalogSet = new Set(displayCatalog)
  const aggregates = new Map<string, { qty: number; amount: number }>()

  for (const sale of sales) {
    for (const line of sale.items) {
      const product = productById.get(line.productId)
      if (!product) continue

      const fromRef = refByProductId
        ? resolveConfiguredProductGroup(line.productId, refByProductId)
        : null
      const aggregateKey = resolveReadReportAggregateKey({
        configuredHeader: fromRef ?? product.code?.trim() ?? null,
        displayCatalogSet,
      })
      if (!aggregateKey) continue

      const cur = aggregates.get(aggregateKey) ?? { qty: 0, amount: 0 }
      cur.qty += Number(line.qty)
      cur.amount += Number(line.lineTotal)
      aggregates.set(aggregateKey, cur)
    }
  }

  const summaryRows = mergeManagementGroupSummary({
    catalog: displayCatalog,
    labels,
    aggregates,
    includeZeroRows: true,
  })

  const groupLines = summaryRows.map((row) => ({
    lineKey: row.headerCode,
    displayLeft: formatReadReportGroupDisplayLeft(row.headerCode, row.label),
    qty: row.qty,
    amount: Math.round(row.amount * 100) / 100,
  }))

  const totals = aggregatePaymentAndTotals(sales)
  return { groupLines, ...totals }
}

/** COLLECTOR — sales-only groups (legacy product groupCode rollup). */
export function aggregatePosReadReportFromSales(
  sales: SaleRowForReadReport[],
  products: Pick<
    Product,
    "id" | "name" | "groupCode" | "typeCode" | "runningCode" | "code"
  >[]
): {
  groupLines: ReadReportGroupLine[]
  paymentLines: ReadReportPaymentLine[]
  grandTotal: number
  saleCount: number
} {
  const productById = new Map(products.map((p) => [p.id, p]))
  const groupMap = new Map<number, GroupAgg>()

  for (const sale of sales) {
    for (const line of sale.items) {
      const pid = line.productId
      const p = productById.get(pid)
      if (!p) continue
      const g = p.groupCode
      const cur = groupMap.get(g) ?? {
        qty: 0,
        amount: 0,
        sampleName: p.name,
      }
      cur.qty += Number(line.qty)
      cur.amount += Number(line.lineTotal)
      if (p.name.length > cur.sampleName.length) cur.sampleName = p.name
      groupMap.set(g, cur)
    }
  }

  const groupLines = [...groupMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([g, v]) => {
      const inGroup = products.filter((p) => p.groupCode === g)
      const p0 =
        inGroup.sort((a, b) => a.code.localeCompare(b.code))[0] ?? null
      const code7 = p0
        ? `${pad2(p0.groupCode)}${pad2(p0.typeCode)}${pad3(p0.runningCode)}`
        : `${pad2(g)}00000`
      const nameShort =
        v.sampleName.length > 22
          ? `${v.sampleName.slice(0, 20)}…`
          : v.sampleName
      return {
        lineKey: String(g),
        displayLeft: `${code7}-${nameShort}`,
        qty: v.qty,
        amount: Math.round(v.amount * 100) / 100,
      }
    })

  const totals = aggregatePaymentAndTotals(sales)
  return { groupLines, ...totals }
}

export function summarizeRefundsForReadReport(
  refunds: Array<{ amount: unknown }>
): { refundCount: number; refundTotal: number } {
  let refundTotal = 0
  for (const refund of refunds) {
    refundTotal += Number(refund.amount)
  }
  return {
    refundCount: refunds.length,
    refundTotal: Math.round(refundTotal * 100) / 100,
  }
}

export function computeReadReportNetTotal(
  grandTotal: number,
  refundTotal: number
): number {
  return Math.round((grandTotal - refundTotal) * 100) / 100
}
