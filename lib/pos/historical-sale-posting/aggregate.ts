import { Prisma } from "@/generated/prisma/client"
import { bangkokDateKey } from "@/lib/reporting/bangkok-calendar"
import {
  addEconomicsTotals,
  decimalToMoneyString,
  emptyEconomicsTotals,
  reconcileHistoricalPostingSummaries,
} from "./economics"
import type {
  HistoricalPostingCsvRow,
  HistoricalPostingEligibleRow,
  HistoricalPostingGrandSummary,
  HistoricalPostingPlan,
  HistoricalPostingSampleRow,
  HistoricalPostingShopSummary,
  HistoricalPostingSkippedRow,
} from "./types"
import { createEmptySkipCounts } from "./classify"
import { vatVerificationFromGross } from "./vat-verification"

const SAMPLE_ROWS_PER_SHOP = 3

type ShopAccumulator = {
  branchCode: string
  branchName: string
  salesCount: number
  receiptCount: number
  eligibleCount: number
  skippedCount: number
  voucherCount: number
  economics: ReturnType<typeof emptyEconomicsTotals>
  sampleRows: HistoricalPostingSampleRow[]
}

export function aggregateHistoricalPostingPlan(input: {
  range: HistoricalPostingPlan["range"]
  branchFilter?: string
  limit?: number
  totalSales: number
  eligibleRows: HistoricalPostingEligibleRow[]
  skippedRows: HistoricalPostingSkippedRow[]
  skipCounts: ReturnType<typeof createEmptySkipCounts>
}): Pick<
  HistoricalPostingPlan,
  | "shopSummaries"
  | "grandSummary"
  | "reconciliation"
  | "eligibleCount"
  | "expectedVoucherCount"
> {
  const shops = new Map<string, ShopAccumulator>()

  function getShop(branchCode: string, branchName: string): ShopAccumulator {
    const existing = shops.get(branchCode)
    if (existing) return existing
    const created: ShopAccumulator = {
      branchCode,
      branchName,
      salesCount: 0,
      receiptCount: 0,
      eligibleCount: 0,
      skippedCount: 0,
      voucherCount: 0,
      economics: emptyEconomicsTotals(),
      sampleRows: [],
    }
    shops.set(branchCode, created)
    return created
  }

  for (const row of input.eligibleRows) {
    const shop = getShop(row.branchCode, row.branchName)
    shop.salesCount += 1
    shop.receiptCount += 1
    shop.eligibleCount += 1
    shop.voucherCount += 1
    shop.economics = addEconomicsTotals(shop.economics, row.economics)
    if (shop.sampleRows.length < SAMPLE_ROWS_PER_SHOP) {
      shop.sampleRows.push(row.sample)
    }
  }

  for (const row of input.skippedRows) {
    const shop = getShop(row.branchCode, row.branchName)
    shop.salesCount += 1
    if (row.reason === "NO_RECEIPT" || row.reason === "MULTIPLE_RECEIPTS") {
      // receiptCount only increments when a receipt exists
    } else {
      shop.receiptCount += 1
    }
    shop.skippedCount += 1
  }

  const shopSummaries: HistoricalPostingShopSummary[] = [...shops.values()]
    .sort((a, b) => a.branchCode.localeCompare(b.branchCode))
    .map((shop) => ({
      branchCode: shop.branchCode,
      branchName: shop.branchName,
      salesCount: shop.salesCount,
      receiptCount: shop.receiptCount,
      eligibleCount: shop.eligibleCount,
      skippedCount: shop.skippedCount,
      voucherCount: shop.voucherCount,
      sampleRows: shop.sampleRows,
      ...shop.economics,
    }))

  const grandSummary: HistoricalPostingGrandSummary = shopSummaries.reduce(
    (acc, shop) => ({
      salesCount: acc.salesCount + shop.salesCount,
      receiptCount: acc.receiptCount + shop.receiptCount,
      eligibleCount: acc.eligibleCount + shop.eligibleCount,
      skippedCount: acc.skippedCount + shop.skippedCount,
      voucherCount: acc.voucherCount + shop.voucherCount,
      ...addEconomicsTotals(acc, shop),
    }),
    {
      salesCount: 0,
      receiptCount: 0,
      eligibleCount: 0,
      skippedCount: 0,
      voucherCount: 0,
      ...emptyEconomicsTotals(),
    }
  )

  return {
    eligibleCount: input.eligibleRows.length,
    expectedVoucherCount: input.eligibleRows.length,
    shopSummaries,
    grandSummary,
    reconciliation: reconcileHistoricalPostingSummaries({
      shopSummaries,
      grandSummary,
    }),
  }
}

export function buildHistoricalSampleRow(input: {
  saleId: string
  receiptNo: string
  branchCode: string
  branchName: string
  createdAt: Date
  total: Prisma.Decimal
  cogs: Prisma.Decimal
}): HistoricalPostingSampleRow {
  const verification = vatVerificationFromGross(input.total)
  return {
    saleId: input.saleId,
    receiptNo: input.receiptNo,
    branchCode: input.branchCode,
    branchName: input.branchName,
    saleDate: bangkokDateKey(input.createdAt),
    gross: decimalToMoneyString(verification.gross),
    calculatedNet: decimalToMoneyString(verification.calculatedNet),
    calculatedVat: decimalToMoneyString(verification.calculatedVat),
    cogs: decimalToMoneyString(input.cogs),
    expectedVoucherRefNo: input.receiptNo,
  }
}

export function buildHistoricalPostingCsvRows(input: {
  eligibleRows: HistoricalPostingEligibleRow[]
  skippedRows: HistoricalPostingSkippedRow[]
}): HistoricalPostingCsvRow[] {
  const eligibleCsv = input.eligibleRows.map((row) => ({
    branchCode: row.branchCode,
    receiptNo: row.receiptNo,
    saleDate: row.sample.saleDate,
    gross: row.sample.gross,
    calculatedNet: row.sample.calculatedNet,
    calculatedVat: row.sample.calculatedVat,
    cogs: row.sample.cogs,
    tender: decimalToMoneyString(row.economics.tenderTotal),
    status: "ELIGIBLE" as const,
    skipReason: "",
  }))

  const skippedCsv = input.skippedRows.map((row) => {
    const gross = row.gross ?? ""
    const verification = gross ? vatVerificationFromGross(gross) : null
    return {
      branchCode: row.branchCode,
      receiptNo: row.receiptNo ?? "",
      saleDate: row.saleDate ?? "",
      gross: verification ? decimalToMoneyString(verification.gross) : gross,
      calculatedNet: verification
        ? decimalToMoneyString(verification.calculatedNet)
        : "",
      calculatedVat: verification
        ? decimalToMoneyString(verification.calculatedVat)
        : "",
      cogs: "",
      tender: "",
      status: "SKIPPED" as const,
      skipReason: row.reason,
    }
  })

  return [...eligibleCsv, ...skippedCsv]
}
