import type {
  EndLine,
  EndSourceContribution,
  EndWorkflowStatus,
  Prisma,
  Role,
  StockDocument,
} from "@/generated/prisma/client"
import type { EndCompleteness, EndCompletenessIssue } from "./end-public-types"

export type { EndCompleteness, EndCompletenessIssue } from "./end-public-types"

export type EndDocument = StockDocument & {
  endLines?: EndLine[]
  endContributions?: EndSourceContribution[]
}

export type GetOrCreateEndInput = {
  legalEntityCode: string
  branchId: string
  periodMonth: string
  staffId: string
  tx?: Prisma.TransactionClient
}

export type GetOrCreateEndResult = {
  document: StockDocument
  created: boolean
}

export type RebuildEndInput = {
  documentId: string
  staffId: string
  tx?: Prisma.TransactionClient
}

export type RebuildEndResult = {
  document: StockDocument
  lineCount: number
  contributionCount: number
  completeness: EndCompleteness
}

export type LockEndInput = {
  documentId: string
  staffId: string
  tx?: Prisma.TransactionClient
}

export type LockEndResult = {
  document: StockDocument
}

export type ReopenEndInput = {
  documentId: string
  staffId: string
  role: Role | string
  reason: string
  tx?: Prisma.TransactionClient
}

export type ReopenEndResult = {
  document: StockDocument
}

export type SubmitEndInput = {
  documentId: string
  staffId: string
  tx?: Prisma.TransactionClient
}

export type SubmitEndResult = {
  document: StockDocument
  completeness: EndCompleteness
}

export type ImportEndCsvMode = "preview" | "apply"

export type ImportEndCsvInput = {
  documentId: string
  staffId: string
  csvText: string
  mode: ImportEndCsvMode
  fileName?: string
  tx?: Prisma.TransactionClient
}

export type ImportEndCsvRowError = {
  row: number
  productCode?: string
  message: string
}

export type ImportEndCsvRowPreview = {
  row: number
  productCode: string
  productId: string
  beginQty: number
  countQty: number | null
  previousBeginQty: number | null
  previousCountQty: number | null
}

export type ImportEndCsvResult = {
  mode: ImportEndCsvMode
  valid: boolean
  rows: ImportEndCsvRowPreview[]
  errors: ImportEndCsvRowError[]
  warnings: string[]
  document?: StockDocument
}

export type ConfirmShopReceiptLineInput = {
  lineId: string
  receivedQty: number
}

export type ConfirmShopReceiptInput = {
  documentId: string
  staffId: string
  lines?: ConfirmShopReceiptLineInput[]
  tx?: Prisma.TransactionClient
}

export type ConfirmShopReceiptResult = {
  document: StockDocument & { lines: { id: string; receivedQty: number | null; qty: number }[] }
  statusChanged: boolean
}

export type EndWorkflowStatusValue = EndWorkflowStatus
