import {
  AccountingPeriodStatus,
  PaymentMethod,
  SaleStatus,
  type Prisma,
} from "@/generated/prisma/client"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { formatPeriodKey } from "@/lib/finance/posting-period"
import { accountingPeriodUniqueWhere } from "@/lib/finance/period-lookup"
import { resolvePosLegalEntityCode } from "@/lib/pos/resolve-pos-sale-vat"
import { STOCK_REF_TYPES } from "@/lib/stock/transaction-types"
import {
  aggregateHistoricalPostingPlan,
  buildHistoricalSampleRow,
  buildHistoricalPostingCsvRows,
} from "./aggregate"
import {
  assertHistoricalRangeBeforeJune,
  classifyHistoricalSaleCandidate,
  createEmptySkipCounts,
  incrementSkipCount,
} from "./classify"
import {
  computeHistoricalSaleEconomics,
  resolveHistoricalSaleVatEconomics,
} from "./economics"
import { sumCogsFromLedgerIssues } from "@/lib/pos/checkout-finance"
import type { HistoricalPostingDateRange } from "./types"
import type { HistoricalPostingPlan } from "./types"
import { listPeriodKeysInRange } from "./date-range"
import { bangkokDateKey } from "@/lib/reporting/bangkok-calendar"

type PlanPrisma = {
  sale: {
    findMany: (args: unknown) => Promise<
      Array<{
        id: string
        branchId: string
        total: Prisma.Decimal
        createdAt: Date
        netAmount: Prisma.Decimal | null
        vatAmount: Prisma.Decimal | null
        vatRateBps: number | null
        taxCode: string | null
        outputVatAccountCode: string | null
        branch: { code: string; name: string }
        receipt: { receiptNo: string } | null
        payment: { method: PaymentMethod } | null
      }>
    >
  }
  receipt: {
    groupBy: (args: unknown) => Promise<Array<{ saleId: string; _count: { id: number } }>>
  }
  voucher: {
    findMany: (args: unknown) => Promise<
      Array<{
        refType: string
        refId: string
        refNo: string | null
        journalEntry: { id: string } | null
      }>
    >
  }
  stockTransaction: {
    findMany: (args: unknown) => Promise<
      Array<{ refId: string; qtyOut: number; unitCost: Prisma.Decimal }>
    >
  }
  accountingPeriod: {
    findMany: (args: unknown) => Promise<
      Array<{ periodKey: string; status: AccountingPeriodStatus }>
    >
  }
}

export type PlanHistoricalPosSalePostingOptions = {
  range: HistoricalPostingDateRange
  branchCode?: string
  limit?: number
}

function groupLedgerRows(
  rows: Array<{ refId: string; qtyOut: number; unitCost: Prisma.Decimal }>
) {
  const grouped = new Map<string, Array<{ qtyOut: number; unitCost: Prisma.Decimal }>>()
  for (const row of rows) {
    const list = grouped.get(row.refId) ?? []
    list.push({ qtyOut: row.qtyOut, unitCost: row.unitCost })
    grouped.set(row.refId, list)
  }
  return grouped
}

function skippedSaleMeta(sale: {
  total: Prisma.Decimal
  createdAt: Date
  receipt: { receiptNo: string } | null
}) {
  return {
    receiptNo: sale.receipt?.receiptNo ?? null,
    saleDate: bangkokDateKey(sale.createdAt),
    gross: sale.total.toFixed(2),
  }
}

export async function planHistoricalPosSalePosting(
  prisma: PlanPrisma,
  options: PlanHistoricalPosSalePostingOptions
): Promise<HistoricalPostingPlan> {
  assertHistoricalRangeBeforeJune(options.range.before)

  const legalEntityCode = resolvePosLegalEntityCode()
  const periodKeys = listPeriodKeysInRange(options.range)
  const periods = await prisma.accountingPeriod.findMany({
    where: {
      periodKey: { in: periodKeys },
      legalEntityCode,
    },
    select: { periodKey: true, status: true },
  })
  const periodStatusByKey = new Map(periods.map((p) => [p.periodKey, p.status]))

  const sales = await prisma.sale.findMany({
    where: {
      status: SaleStatus.COMPLETED,
      createdAt: { gte: options.range.from, lt: options.range.before },
      ...(options.branchCode
        ? { branch: { code: options.branchCode } }
        : {}),
    },
    include: {
      branch: { select: { code: true, name: true } },
      receipt: { select: { receiptNo: true } },
      payment: { select: { method: true } },
    },
    orderBy: { createdAt: "asc" },
    ...(options.limit ? { take: options.limit } : {}),
  })

  const saleIds = sales.map((s) => s.id)
  const [receiptCounts, vouchers, ledgerRows] = await Promise.all([
    saleIds.length > 0
      ? prisma.receipt.groupBy({
          by: ["saleId"],
          where: { saleId: { in: saleIds } },
          _count: { id: true },
        })
      : Promise.resolve([]),
    saleIds.length > 0
      ? prisma.voucher.findMany({
          where: {
            refType: FINANCE_REF_TYPES.POS_SALE,
            refId: { in: saleIds },
          },
          select: {
            refType: true,
            refId: true,
            refNo: true,
            journalEntry: { select: { id: true } },
          },
        })
      : Promise.resolve([]),
    saleIds.length > 0
      ? prisma.stockTransaction.findMany({
          where: {
            refType: STOCK_REF_TYPES.POS_SALE,
            refId: { in: saleIds },
          },
          select: { refId: true, qtyOut: true, unitCost: true },
        })
      : Promise.resolve([]),
  ])

  const receiptCountBySaleId = new Map(
    receiptCounts.map((row) => [row.saleId, row._count.id])
  )
  const voucherBySaleId = new Map(vouchers.map((v) => [v.refId, v]))
  const ledgerBySaleId = groupLedgerRows(ledgerRows)

  const skipCounts = createEmptySkipCounts()
  const eligibleRows: HistoricalPostingPlan["eligibleRows"] = []
  const skippedRows: HistoricalPostingPlan["skippedRows"] = []

  for (const sale of sales) {
    const branchCode = sale.branch.code
    const branchName = sale.branch.name
    const receiptCount = receiptCountBySaleId.get(sale.id) ?? (sale.receipt ? 1 : 0)
    const existingVoucher = voucherBySaleId.get(sale.id)
    const periodKey = formatPeriodKey(sale.createdAt)
    const periodStatus = periodStatusByKey.get(periodKey)

    const skipReason = classifyHistoricalSaleCandidate({
      saleId: sale.id,
      total: sale.total,
      createdAt: sale.createdAt,
      receiptCount,
      receiptNo: sale.receipt?.receiptNo,
      hasPayment: Boolean(sale.payment),
      existingVoucher: existingVoucher
        ? {
            refType: existingVoucher.refType,
            refId: existingVoucher.refId,
            refNo: existingVoucher.refNo,
            hasJournal: Boolean(existingVoucher.journalEntry),
          }
        : null,
      periodStatus: periodStatus ?? "MISSING",
    })

    if (skipReason) {
      incrementSkipCount(skipCounts, skipReason)
      skippedRows.push({
        saleId: sale.id,
        branchCode,
        branchName,
        reason: skipReason,
        ...skippedSaleMeta(sale),
      })
      continue
    }

    const vatEconomics = resolveHistoricalSaleVatEconomics({
      total: sale.total,
      createdAt: sale.createdAt,
      netAmount: sale.netAmount,
      vatAmount: sale.vatAmount,
      vatRateBps: sale.vatRateBps,
      taxCode: sale.taxCode,
      outputVatAccountCode: sale.outputVatAccountCode,
    })

    if (!vatEconomics || !sale.receipt || !sale.payment) {
      incrementSkipCount(skipCounts, "MISSING_POSTING_DATA")
      skippedRows.push({
        saleId: sale.id,
        branchCode,
        branchName,
        reason: "MISSING_POSTING_DATA",
        ...skippedSaleMeta(sale),
      })
      continue
    }

    const saleLedgerRows = ledgerBySaleId.get(sale.id) ?? []
    const economics = computeHistoricalSaleEconomics({
      total: sale.total,
      paymentMethod: sale.payment.method,
      ledgerRows: saleLedgerRows,
      vatEconomics,
    })
    const cogsAmount = sumCogsFromLedgerIssues(saleLedgerRows)

    eligibleRows.push({
      saleId: sale.id,
      branchId: sale.branchId,
      branchCode,
      branchName,
      receiptNo: sale.receipt.receiptNo,
      sale: {
        id: sale.id,
        branchId: sale.branchId,
        total: sale.total,
        createdAt: sale.createdAt,
        netAmount: sale.netAmount,
        vatAmount: sale.vatAmount,
        vatRateBps: sale.vatRateBps,
        taxCode: sale.taxCode,
        outputVatAccountCode: sale.outputVatAccountCode,
      },
      payment: { method: sale.payment.method },
      ledgerRows: saleLedgerRows,
      vatEconomics,
      economics,
      sample: buildHistoricalSampleRow({
        saleId: sale.id,
        receiptNo: sale.receipt.receiptNo,
        branchCode,
        branchName,
        createdAt: sale.createdAt,
        total: sale.total,
        cogs: cogsAmount,
      }),
    })
  }

  const aggregated = aggregateHistoricalPostingPlan({
    range: options.range,
    branchFilter: options.branchCode,
    limit: options.limit,
    totalSales: sales.length,
    eligibleRows,
    skippedRows,
    skipCounts,
  })

  return {
    range: options.range,
    branchFilter: options.branchCode,
    limit: options.limit,
    totalSales: sales.length,
    skipCounts,
    eligibleRows,
    skippedRows,
    csvRows: buildHistoricalPostingCsvRows({ eligibleRows, skippedRows }),
    ...aggregated,
  }
}
