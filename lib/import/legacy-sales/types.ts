import type {
  LegacySalesImportBatchStatus,
  LegacySalesImportRowStatus,
} from "@/generated/prisma/client"

export type LegacySalesStageOptions = {
  filePath: string
  sourceFileName: string
  year: number
  apply: boolean
}

export type LegacySalesValidateOptions = {
  batchId: string
  apply: boolean
}

export type LegacySalesConvertOptions = {
  batchId: string
  apply: boolean
}

export type ParsedLegacySalesDbfRow = {
  sourceRowNo: number
  legacyTransNo: string
  legacyDate: string
  legacyTime: string
  legacyBranchId: string
  legacyStaffId: string | null
  legacyProductCode: string
  qty: number
  amount: number
  normalizedSaleDateTime: Date | null
  legacySaleDateKey: string | null
}

export type LegacySalesStageSummary = {
  batchId: string | null
  sourceFileName: string
  year: number
  mode: "dry-run" | "apply"
  totalFileRows: number
  acceptedRows: number
  skippedOldRows: number
  skippedDuplicateRows: number
  parseErrors: string[]
}

export type LegacySalesValidationSummary = {
  batchId: string
  mode: "dry-run" | "apply"
  pendingRows: number
  validRows: number
  invalidRows: number
  unmatchedBranches: string[]
  unmatchedProducts: string[]
  unmatchedStaff: string[]
  negativeQtyRows: number
  negativeAmountRows: number
  zeroQtyRows: number
  byDate: LegacySalesAggregateRow[]
  byBranch: LegacySalesAggregateRow[]
  totals: {
    transactionCount: number
    lineCount: number
    totalAmount: number
  }
}

export type LegacySalesAggregateRow = {
  key: string
  transactionCount: number
  lineCount: number
  totalAmount: number
  unmatchedProductCount: number
}

export type LegacySalesConvertSummary = {
  batchId: string
  mode: "dry-run" | "apply"
  transactionGroups: number
  lineCount: number
  totalAmount: number
  wouldCreateSales: number
  createdSales: number
  skippedAlreadyImported: number
  errors: string[]
}

export type LegacySalesBatchRef = {
  id: string
  sourceFileName: string
  year: number
  status: LegacySalesImportBatchStatus
}

export type LegacySalesRowRef = {
  id: string
  status: LegacySalesImportRowStatus
  legacyTransNo: string
  legacyDate: string
  legacyTime: string
  legacyBranchId: string
  legacyStaffId: string | null
  legacyProductCode: string
  qty: number
  amount: { toString(): string }
  normalizedSaleDateTime: Date | null
  mappedBranchId: string | null
  mappedStaffId: string | null
  mappedProductId: string | null
  createdSaleId: string | null
}
