import type { Prisma } from "@/generated/prisma/client"
import type { PosVatEconomics } from "@/lib/finance/pos-sale-vat"

export type HistoricalRefundCliOptions = {
  execute: boolean
  confirm: string
  fromDateKey: string
  beforeDateKey: string
  branchCode?: string
  limit?: number
  csv: boolean
  monthKey?: string
  file?: string
}

export type HistoricalRefundSourceLine = {
  sourceRowNo: number
  legacyTransNo: string
  legacyDate: string
  legacyTime: string
  legacyBranchId: string
  legacyStaffId: string | null
  legacyProductCode: string
  qty: number
  /** Absolute positive line gross (source S_AMOUNT may be negative). */
  amountAbs: number
  /** Original signed S_AMOUNT. */
  amountSigned: number
  dateKey: string
  refundAt: Date
}

export type HistoricalRefundDocument = {
  key: string
  sourceFileName: string
  legacyBranchId: string
  legacyTransNo: string
  legacyRefundDate: string
  legacyRefundTime: string
  refundAt: Date
  branchCode: string
  branchId: string | null
  staffId: string | null
  legacyStaffId: string | null
  lines: HistoricalRefundSourceLine[]
  sourceRowCount: number
  gross: Prisma.Decimal
  net: Prisma.Decimal
  vat: Prisma.Decimal
  vatEconomics: PosVatEconomics
  skipReason:
    | null
    | "MISSING_BRANCH"
    | "ALREADY_IMPORTED"
    | "ALREADY_POSTED"
    | "INCOMPLETE_VOUCHER"
    | "ZERO_AMOUNT"
}

export type HistoricalRefundPlanTotals = {
  sourceRows: number
  documents: number
  eligibleImport: number
  alreadyImported: number
  eligiblePosting: number
  alreadyPosted: number
  incompleteVoucher: number
  missingBranch: number
  missingStaff: number
  zeroAmount: number
  gross: string
  net: string
  vat: string
}

export type HistoricalRefundBranchTotal = {
  branchCode: string
  legacyBranchId: string
  documents: number
  gross: string
  net: string
  vat: string
}

export type HistoricalRefundPlan = {
  sourceFilePath: string
  sourceFileName: string
  fromDateKey: string
  beforeDateKey: string
  documents: HistoricalRefundDocument[]
  totals: HistoricalRefundPlanTotals
  byBranch: HistoricalRefundBranchTotal[]
  sampleDocuments: HistoricalRefundDocument[]
}

export type HistoricalRefundExecuteResult = {
  attemptedImport: number
  imported: number
  skippedAlreadyImported: number
  attemptedPosting: number
  posted: number
  alreadyPosted: number
  failed: Array<{ key: string; error: string }>
}
