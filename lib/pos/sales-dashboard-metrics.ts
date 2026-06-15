import { SaleStatus, type Prisma } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import {
  bangkokDateKey,
  bangkokMonthRange,
  monthDayKeys,
} from "@/lib/reporting/bangkok-calendar"
import { toDec, ZERO } from "@/lib/stock/decimal"

/**
 * Sales dashboard aggregation rules:
 *
 * - Day / calendar cells: GROSS sales by sale.createdAt (Bangkok date). Refunds are NOT subtracted.
 * - Month summary: gross = sales in month; refunds = refunds by refund.createdAt month; net = gross - refunds.
 */

export type SalesDashboardDaySales = {
  dateKey: string
  /** Gross sale total for the day (refunds not subtracted). */
  grossSales: string
}

export type MonthlySalesDashboardSummary = {
  year: number
  month: number
  /** Sum of completed sale totals created in the selected month. */
  grossSales: string
  /** Sum of refund amounts created in the selected month (cash-out month). */
  refunds: string
  /** grossSales - refunds */
  netSales: string
  /** Completed sale count in the selected month. */
  billCount: number
}

export type SalesDashboardMetricsResult = {
  year: number
  month: number
  days: SalesDashboardDaySales[]
  monthSummary: MonthlySalesDashboardSummary
}

export type SalesDashboardMetricsDb = Pick<PrismaClient, "sale" | "refund">

function initGrossByDayMap(
  year: number,
  fromMonth: number,
  throughMonth: number
): Map<string, Prisma.Decimal> {
  const grossByDay = new Map<string, Prisma.Decimal>()
  for (let month = fromMonth; month <= throughMonth; month++) {
    for (const key of monthDayKeys(year, month)) {
      grossByDay.set(key, ZERO)
    }
  }
  return grossByDay
}

function accumulateSalesIntoGrossByDay(
  grossByDay: Map<string, Prisma.Decimal>,
  sales: ReadonlyArray<{ total: Prisma.Decimal | null; createdAt: Date }>
): void {
  for (const sale of sales) {
    const key = bangkokDateKey(sale.createdAt)
    if (!grossByDay.has(key)) continue
    grossByDay.set(key, (grossByDay.get(key) ?? ZERO).plus(toDec(sale.total)))
  }
}

/**
 * Daily gross sales (not cumulative) from fromMonth through throughMonth inclusive.
 * Used for year-to-date dashboard aggregation.
 */
export async function getSalesDashboardGrossByDayInRange(
  db: SalesDashboardMetricsDb,
  input: {
    branchId: string
    year: number
    fromMonth: number
    throughMonth: number
  }
): Promise<Map<string, Prisma.Decimal>> {
  const branchId = String(input.branchId ?? "").trim()
  if (!branchId) {
    throw new Error("branchId is required")
  }

  const year = input.year
  const fromMonth = input.fromMonth
  const throughMonth = input.throughMonth
  assertYear(year)
  if (!Number.isFinite(fromMonth) || fromMonth < 1 || fromMonth > 12) {
    throw new Error("Invalid fromMonth")
  }
  assertMonth(throughMonth)
  if (fromMonth > throughMonth) {
    throw new Error("fromMonth must be <= throughMonth")
  }

  const { start } = bangkokMonthRange(year, fromMonth)
  const { end } = bangkokMonthRange(year, throughMonth)

  const sales = await db.sale.findMany({
    where: {
      branchId,
      status: SaleStatus.COMPLETED,
      createdAt: { gte: start, lte: end },
    },
    select: { total: true, createdAt: true },
  })

  const grossByDay = initGrossByDayMap(year, fromMonth, throughMonth)
  accumulateSalesIntoGrossByDay(grossByDay, sales)
  return grossByDay
}

/**
 * Refund total from fromMonth through throughMonth inclusive (Bangkok calendar).
 */
export async function getSalesDashboardRefundsTotalInRange(
  db: SalesDashboardMetricsDb,
  input: {
    branchId: string
    year: number
    fromMonth: number
    throughMonth: number
  }
): Promise<Prisma.Decimal> {
  const branchId = String(input.branchId ?? "").trim()
  if (!branchId) {
    throw new Error("branchId is required")
  }

  const year = input.year
  const fromMonth = input.fromMonth
  const throughMonth = input.throughMonth
  assertYear(year)
  if (!Number.isFinite(fromMonth) || fromMonth < 1 || fromMonth > 12) {
    throw new Error("Invalid fromMonth")
  }
  assertMonth(throughMonth)
  if (fromMonth > throughMonth) {
    throw new Error("fromMonth must be <= throughMonth")
  }

  const { start } = bangkokMonthRange(year, fromMonth)
  const { end } = bangkokMonthRange(year, throughMonth)

  const refunds = await db.refund.findMany({
    where: {
      branchId,
      createdAt: { gte: start, lte: end },
    },
    select: { amount: true },
  })

  return refunds.reduce((total, refund) => total.plus(toDec(refund.amount)), ZERO)
}

function assertMonth(month: number): void {
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error("Invalid month")
  }
}

function assertYear(year: number): void {
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    throw new Error("Invalid year")
  }
}

export async function getSalesDashboardMetrics(
  db: SalesDashboardMetricsDb,
  input: { branchId: string; year: number; month: number }
): Promise<SalesDashboardMetricsResult> {
  const branchId = String(input.branchId ?? "").trim()
  if (!branchId) {
    throw new Error("branchId is required")
  }

  const year = input.year
  const month = input.month
  assertYear(year)
  assertMonth(month)

  const { start, end } = bangkokMonthRange(year, month)

  const [sales, refunds] = await Promise.all([
    db.sale.findMany({
      where: {
        branchId,
        status: SaleStatus.COMPLETED,
        createdAt: { gte: start, lte: end },
      },
      select: { total: true, createdAt: true },
    }),
    db.refund.findMany({
      where: {
        branchId,
        createdAt: { gte: start, lte: end },
      },
      select: { amount: true },
    }),
  ])

  const grossByDay = new Map<string, Prisma.Decimal>()
  for (const key of monthDayKeys(year, month)) {
    grossByDay.set(key, ZERO)
  }

  let monthGross = ZERO
  for (const sale of sales) {
    const amount = toDec(sale.total)
    monthGross = monthGross.plus(amount)
    const key = bangkokDateKey(sale.createdAt)
    if (grossByDay.has(key)) {
      grossByDay.set(key, (grossByDay.get(key) ?? ZERO).plus(amount))
    }
  }

  let monthRefunds = ZERO
  for (const refund of refunds) {
    monthRefunds = monthRefunds.plus(toDec(refund.amount))
  }

  const monthNet = monthGross.minus(monthRefunds)

  const days: SalesDashboardDaySales[] = monthDayKeys(year, month).map((dateKey) => ({
    dateKey,
    grossSales: (grossByDay.get(dateKey) ?? ZERO).toFixed(2),
  }))

  const monthSummary: MonthlySalesDashboardSummary = {
    year,
    month,
    grossSales: monthGross.toFixed(2),
    refunds: monthRefunds.toFixed(2),
    netSales: monthNet.toFixed(2),
    billCount: sales.length,
  }

  return { year, month, days, monthSummary }
}
