import { SaleStatus, type Prisma } from "@/generated/prisma/client"
import { getRefundPreview } from "@/lib/pos/refund"
import { RefundError } from "@/lib/pos/refund-errors"
import { resolveReceiptEvidenceStatus } from "@/lib/pos/payment-evidence"
import { getSalesDashboardMetrics } from "@/lib/pos/sales-dashboard-metrics"
import {
  bangkokDayRange,
  bangkokTimeLabel,
  monthDayKeys,
  previousCalendarMonth,
} from "@/lib/reporting/bangkok-calendar"
import { getComparableLastMonthDateFromDateKey } from "@/lib/shop-ui/comparable-last-month-date"
import { SalesDashboardError } from "@/lib/shop/sales-dashboard-errors"
import type {
  SalesDashboardDayDetail,
  SalesDashboardView,
} from "@/lib/shop/sales-dashboard-types"
import {
  getBranchSalesTarget,
  listActiveShopBranches,
  splitMonthlyTargetToDaily,
} from "@/lib/shop/sales-targets"
import { toDec, ZERO } from "@/lib/stock/decimal"

type SalesDashboardDb = Pick<
  Prisma.TransactionClient,
  "sale" | "refund" | "branchSalesTarget" | "branch"
>

function parseDateKey(dateKey: string): string {
  const trimmed = String(dateKey ?? "").trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new SalesDashboardError(
      "dateKey must be YYYY-MM-DD",
      "INVALID_DATE_KEY",
      400
    )
  }
  try {
    bangkokDayRange(trimmed)
  } catch {
    throw new SalesDashboardError(
      "dateKey must be YYYY-MM-DD",
      "INVALID_DATE_KEY",
      400
    )
  }
  return trimmed
}

function sumDecimal(values: { total?: Prisma.Decimal | null }[]): Prisma.Decimal {
  return values.reduce((acc, row) => acc.plus(toDec(row.total)), ZERO)
}

async function assertActiveShopBranch(
  db: SalesDashboardDb,
  branchId: string
): Promise<void> {
  const branches = await listActiveShopBranches(db)
  if (!branches.some((b) => b.id === branchId)) {
    throw new SalesDashboardError("Branch not found", "BRANCH_NOT_FOUND", 404)
  }
}

export async function buildSalesDashboardView(
  db: SalesDashboardDb,
  input: { year: number; month: number; branchId?: string | null }
): Promise<SalesDashboardView> {
  const { year, month } = input
  const branches = await listActiveShopBranches(db)
  const branchId = String(input.branchId ?? "").trim()

  if (branchId) {
    await assertActiveShopBranch(db, branchId)
  }

  const branchIds = branchId ? [branchId] : branches.map((b) => b.id)
  const dayKeys = monthDayKeys(year, month)

  const targetByDay = new Map<string, Prisma.Decimal>()
  for (const key of dayKeys) {
    targetByDay.set(key, ZERO)
  }

  let hasAnyTarget = false
  for (const bid of branchIds) {
    const target = await getBranchSalesTarget(db, { branchId: bid, year, month })
    if (!target.exists) continue
    hasAnyTarget = true
    const daily = splitMonthlyTargetToDaily({
      monthlyTotal: target.monthlyTotal,
      weekPattern: target.weekPattern,
      year,
      month,
    })
    for (const row of daily) {
      targetByDay.set(
        row.dateKey,
        (targetByDay.get(row.dateKey) ?? ZERO).plus(toDec(row.target))
      )
    }
  }

  const actualByDay = new Map<string, Prisma.Decimal>()
  for (const key of dayKeys) {
    actualByDay.set(key, ZERO)
  }

  let monthGross = ZERO
  let monthRefunds = ZERO
  let monthBillCount = 0

  for (const bid of branchIds) {
    const metrics = await getSalesDashboardMetrics(db, { branchId: bid, year, month })
    monthGross = monthGross.plus(toDec(metrics.monthSummary.grossSales))
    monthRefunds = monthRefunds.plus(toDec(metrics.monthSummary.refunds))
    monthBillCount += metrics.monthSummary.billCount
    for (const row of metrics.days) {
      actualByDay.set(
        row.dateKey,
        (actualByDay.get(row.dateKey) ?? ZERO).plus(toDec(row.grossSales))
      )
    }
  }

  const previous = previousCalendarMonth(year, month)
  const lastMonthByDay = new Map<string, Prisma.Decimal>()
  for (const key of monthDayKeys(previous.year, previous.month)) {
    lastMonthByDay.set(key, ZERO)
  }

  for (const bid of branchIds) {
    const metrics = await getSalesDashboardMetrics(db, {
      branchId: bid,
      year: previous.year,
      month: previous.month,
    })
    for (const row of metrics.days) {
      lastMonthByDay.set(
        row.dateKey,
        (lastMonthByDay.get(row.dateKey) ?? ZERO).plus(toDec(row.grossSales))
      )
    }
  }

  let lastMonthSalesTotal = ZERO
  const days = dayKeys.map((dateKey) => {
    const comparableDateKey = getComparableLastMonthDateFromDateKey(dateKey)
    const lastMonthGross =
      comparableDateKey == null
        ? null
        : (lastMonthByDay.get(comparableDateKey) ?? ZERO).toFixed(2)

    if (comparableDateKey != null) {
      lastMonthSalesTotal = lastMonthSalesTotal.plus(
        lastMonthByDay.get(comparableDateKey) ?? ZERO
      )
    }

    return {
      dateKey,
      target: hasAnyTarget
        ? (targetByDay.get(dateKey) ?? ZERO).toFixed(2)
        : null,
      actualGross: (actualByDay.get(dateKey) ?? ZERO).toFixed(2),
      lastMonthGross,
    }
  })

  return {
    scope: branchId ? "branch" : "company",
    year,
    month,
    branches,
    monthSummary: {
      lastMonthSales: lastMonthSalesTotal.toFixed(2),
      grossSales: monthGross.toFixed(2),
      refunds: monthRefunds.toFixed(2),
      netSales: monthGross.minus(monthRefunds).toFixed(2),
      billCount: monthBillCount,
    },
    days,
    hasAnyTarget,
  }
}

async function loadBranchDaySales(
  db: SalesDashboardDb,
  branchId: string,
  dateKey: string
) {
  const { start, end } = bangkokDayRange(dateKey)
  return db.sale.findMany({
    where: {
      branchId,
      status: SaleStatus.COMPLETED,
      createdAt: { gte: start, lte: end },
    },
    include: {
      receipt: true,
      payment: { include: { paymentEvidence: true } },
    },
    orderBy: { createdAt: "asc" },
  })
}

function mapReceiptEvidenceStatus(
  sale: {
    payment: {
      method: string
      paymentEvidence: { status: string } | null
    } | null
  }
): "PENDING" | "UPLOADED" | "MISSING" | null {
  const method = sale.payment?.method
  if (!method) return null
  return resolveReceiptEvidenceStatus({
    paymentMethod: method,
    evidenceStatus: sale.payment?.paymentEvidence?.status as
      | "PENDING"
      | "UPLOADED"
      | "MISSING"
      | undefined,
  })
}

export async function getSalesDashboardDayDetail(
  db: SalesDashboardDb,
  input: {
    dateKey: string
    branchId?: string | null
    saleId?: string | null
  }
): Promise<SalesDashboardDayDetail> {
  const dateKey = parseDateKey(input.dateKey)
  const branchId = String(input.branchId ?? "").trim()
  const saleId = String(input.saleId ?? "").trim()

  if (saleId) {
    if (!branchId) {
      throw new SalesDashboardError(
        "branchId is required when saleId is provided",
        "BRANCH_REQUIRED",
        400
      )
    }
    await assertActiveShopBranch(db, branchId)

    let preview
    try {
      preview = await getRefundPreview(db, { saleId, branchId })
    } catch (err) {
      if (err instanceof RefundError && err.code === "SALE_NOT_FOUND") {
        throw new SalesDashboardError("Sale not found", "SALE_NOT_FOUND", 404)
      }
      throw err
    }

    const sale = await db.sale.findFirst({
      where: { id: saleId, branchId, status: SaleStatus.COMPLETED },
      include: {
        receipt: true,
        payment: { include: { paymentEvidence: true } },
      },
    })
    if (!sale?.receipt) {
      throw new SalesDashboardError("Sale not found", "SALE_NOT_FOUND", 404)
    }

    const linkedRefunds = await db.refund.findMany({
      where: { saleId, branchId },
      orderBy: { createdAt: "asc" },
    })

    const salePrintUrl = `/shop/receipt/${encodeURIComponent(saleId)}?branchId=${encodeURIComponent(branchId)}`

    return {
      mode: "receipt-preview",
      preview: {
        saleId,
        branchId,
        receiptNo: sale.receipt.receiptNo,
        time: bangkokTimeLabel(sale.createdAt),
        saleTotal: preview.saleTotal,
        refundedTotal: preview.refundedTotal,
        remainingRefundable: preview.remainingRefundable,
        items: preview.items,
        linkedRefunds: linkedRefunds.map((r) => ({
          refundId: r.id,
          refundNo: r.refundNo,
          amount: toDec(r.amount).toFixed(2),
          createdAt: r.createdAt.toISOString(),
          printUrl: `/shop/refund-receipt/${encodeURIComponent(r.id)}?branchId=${encodeURIComponent(branchId)}`,
        })),
        salePrintUrl,
        evidenceStatus: mapReceiptEvidenceStatus(sale),
      },
    }
  }

  if (branchId) {
    await assertActiveShopBranch(db, branchId)
    const branch = await db.branch.findUnique({
      where: { id: branchId },
      select: { code: true },
    })
    const sales = await loadBranchDaySales(db, branchId, dateKey)

    return {
      mode: "receipt-list",
      dateKey,
      branchId,
      branchCode: branch?.code ?? "",
      receipts: sales
        .filter((s) => s.receipt)
        .map((s) => ({
          saleId: s.id,
          receiptNo: s.receipt!.receiptNo,
          time: bangkokTimeLabel(s.createdAt),
          total: toDec(s.total).toFixed(2),
          evidenceStatus: mapReceiptEvidenceStatus(s),
        })),
    }
  }

  const branches = await listActiveShopBranches(db)
  const rows = await Promise.all(
    branches.map(async (branch) => {
      const sales = await loadBranchDaySales(db, branch.id, dateKey)
      return {
        branchId: branch.id,
        code: branch.code,
        name: branch.name,
        grossSales: sumDecimal(sales).toFixed(2),
        receiptCount: sales.length,
      }
    })
  )

  return {
    mode: "branch-summary",
    dateKey,
    branches: rows,
  }
}
