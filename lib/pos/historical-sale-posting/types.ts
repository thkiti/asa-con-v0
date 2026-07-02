import type { Prisma, PaymentMethod } from "@/generated/prisma/client"
import type { PosVatEconomics } from "@/lib/finance/pos-sale-vat"
import type { LedgerIssueRow } from "@/lib/pos/checkout-finance"

export type HistoricalPostingSkipReason =
  | "ALREADY_POSTED"
  | "NO_RECEIPT"
  | "MULTIPLE_RECEIPTS"
  | "MISSING_PAYMENT"
  | "MISSING_POSTING_DATA"
  | "PERIOD_CLOSED"
  | "PERIOD_NOT_OPENED"
  | "INCOMPLETE_VOUCHER"

export type HistoricalPostingDateRange = {
  from: Date
  before: Date
  fromDateKey: string
  beforeDateKey: string
}

export type HistoricalPostingCliOptions = {
  execute: boolean
  confirm: string
  fromDateKey: string
  beforeDateKey: string
  branchCode?: string
  limit?: number
  csv: boolean
  monthKey?: string
}

export type HistoricalPostingSampleRow = {
  saleId: string
  receiptNo: string
  branchCode: string
  branchName: string
  saleDate: string
  gross: string
  calculatedNet: string
  calculatedVat: string
  cogs: string
  expectedVoucherRefNo: string
}

export type HistoricalPostingEconomicsTotals = {
  grossTotal: Prisma.Decimal
  calculatedNetTotal: Prisma.Decimal
  calculatedVatTotal: Prisma.Decimal
  netRevenueTotal: Prisma.Decimal
  outputVatTotal: Prisma.Decimal
  cogsTotal: Prisma.Decimal
  inventoryCreditTotal: Prisma.Decimal
  tenderTotal: Prisma.Decimal
  tenderByMethod: Record<string, Prisma.Decimal>
  tenderByAccountCode: Record<string, Prisma.Decimal>
}

export type HistoricalPostingShopSummary = HistoricalPostingEconomicsTotals & {
  branchCode: string
  branchName: string
  salesCount: number
  receiptCount: number
  eligibleCount: number
  skippedCount: number
  voucherCount: number
  sampleRows: HistoricalPostingSampleRow[]
}

export type HistoricalPostingGrandSummary = HistoricalPostingEconomicsTotals & {
  salesCount: number
  receiptCount: number
  eligibleCount: number
  skippedCount: number
  voucherCount: number
}

export type HistoricalPostingSkipCounts = {
  total: number
} & Record<HistoricalPostingSkipReason, number>

export type HistoricalPostingReconciliationCheck = {
  name: string
  pass: boolean
  leftLabel: string
  leftValue: string
  rightLabel: string
  rightValue: string
  difference: string
}

export type HistoricalPostingReconciliation = {
  grossEqualsNetPlusVat: boolean
  tenderEqualsGross: boolean
  cogsEqualsInventoryCredit: boolean
  shopGrossSumEqualsGrandGross: boolean
  shopVoucherCountEqualsGrandVoucherCount: boolean
  checks: HistoricalPostingReconciliationCheck[]
}

export type HistoricalPostingCsvRow = {
  branchCode: string
  receiptNo: string
  saleDate: string
  gross: string
  calculatedNet: string
  calculatedVat: string
  cogs: string
  tender: string
  status: "ELIGIBLE" | "SKIPPED"
  skipReason: string
}

export type HistoricalPostingEligibleRow = {
  saleId: string
  branchId: string
  branchCode: string
  branchName: string
  receiptNo: string
  sale: {
    id: string
    branchId: string
    total: Prisma.Decimal
    createdAt: Date
    netAmount: Prisma.Decimal | null
    vatAmount: Prisma.Decimal | null
    vatRateBps: number | null
    taxCode: string | null
    outputVatAccountCode: string | null
  }
  payment: { method: PaymentMethod }
  ledgerRows: LedgerIssueRow[]
  vatEconomics: PosVatEconomics
  economics: HistoricalPostingEconomicsTotals
  sample: HistoricalPostingSampleRow
}

export type HistoricalPostingSkippedRow = {
  saleId: string
  branchCode: string
  branchName: string
  reason: HistoricalPostingSkipReason
  receiptNo?: string | null
  saleDate?: string | null
  gross?: string | null
}

export type HistoricalPostingPlan = {
  range: HistoricalPostingDateRange
  branchFilter?: string
  limit?: number
  totalSales: number
  eligibleCount: number
  expectedVoucherCount: number
  skipCounts: HistoricalPostingSkipCounts
  shopSummaries: HistoricalPostingShopSummary[]
  grandSummary: HistoricalPostingGrandSummary
  reconciliation: HistoricalPostingReconciliation
  eligibleRows: HistoricalPostingEligibleRow[]
  skippedRows: HistoricalPostingSkippedRow[]
  csvRows: HistoricalPostingCsvRow[]
}

export type HistoricalPostingExecuteResult = {
  attempted: number
  created: number
  alreadyPosted: number
  failed: Array<{ saleId: string; receiptNo: string; error: string }>
}
