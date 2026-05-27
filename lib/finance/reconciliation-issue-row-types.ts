import type { PrismaClient } from "@/generated/prisma/client"
import type { ReconciliationIssueType } from "./reconciliation-types"

export type ReconciliationIssueRowStatus =
  | "MATCHED"
  | "VARIANCE"
  | "MISSING_SOURCE"
  | "MISSING_GL"

export type IssueAuditInput = {
  sourceType: "SALE" | "STOCK_DOCUMENT"
  sourceId: string
  issueType: ReconciliationIssueType
  severity: "ERROR" | "WARNING"
  message: string
  expectedAmount?: number
  actualAmount?: number
  difference?: number
}

export type ReconciliationIssuesFilter = {
  branchId?: string
  from?: string
  to?: string
  sourceType?: "SALE" | "STOCK_DOCUMENT"
  status?: ReconciliationIssueRowStatus
  domain?: string
  issueType?: ReconciliationIssueType
}

export type ReconciliationIssueVoucherRef = {
  id: string
  voucherNo: string
  refType: string
  refId: string
  postedAt: string | null
}

export type ReconciliationIssueJournalRef = {
  id: string
  voucherId: string
  postedAt: string
}

export type ReconciliationIssueRow = {
  id: string
  sourceType: "SALE" | "STOCK_DOCUMENT"
  sourceId: string
  documentRef: string
  issueType: ReconciliationIssueType
  severity: "ERROR" | "WARNING"
  status: ReconciliationIssueRowStatus
  message: string
  expectedAmount: number | null
  actualAmount: number | null
  difference: number | null
  vouchers: ReconciliationIssueVoucherRef[]
  journalEntries: ReconciliationIssueJournalRef[]
  sourceCreatedAt: string | null
  sourcePostedAt: string | null
}

export type ReconciliationIssuesResult = {
  filter: ReconciliationIssuesFilter
  checkedSales: number
  checkedStockDocuments: number
  issueCount: number
  issues: ReconciliationIssueRow[]
}

export type ReconciliationIssueRowsPrisma = Pick<
  PrismaClient,
  "sale" | "stockDocument" | "voucher"
>
