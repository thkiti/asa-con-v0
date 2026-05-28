import type { AccountingPeriodStatus } from "@/generated/prisma/client"
import type {
  ReconciliationSnapshotHeader,
  ReconciliationSnapshotPayloadV1,
} from "./reconciliation-snapshot-types"

export type CloseReadinessStatus = "READY" | "WARNING" | "BLOCKED"

export type CloseChecklistGroup =
  | "reconciliation"
  | "snapshot_evidence"
  | "posting_lock"
  | "audit_evidence"

export type CloseChecklistSeverity = "BLOCKED" | "WARNING" | "INFO" | "PASS"

export type CloseChecklistItemRef = {
  snapshotId?: string
  periodKey?: string
  branchId?: string
  compareSnapshotId?: string
}

export type CloseChecklistItem = {
  id: string
  group: CloseChecklistGroup
  severity: CloseChecklistSeverity
  title: string
  detail: string
  refs?: CloseChecklistItemRef
}

export type CloseChecklistPeriodInput = {
  id: string
  branchId: string
  periodKey: string
  status: AccountingPeriodStatus
  closedAt: string | null
}

export type CloseChecklistSnapshotRef = {
  id: string
  createdAt: string
  periodKey: string | null
  branchId: string | null
  label: string | null
}

export type CloseChecklistIssueSummary = {
  totalCount: number
  missingGlCount: number
  missingSourceCount: number
  varianceStatusCount: number
  errorSeverityCount: number
}

export type CloseChecklistMetrics = {
  issueCount: number
  varianceCount: number
  matchedCount: number
  dashboardRowCount: number
  totalVarianceAmount: string | null
  missingGlIssueCount: number
  missingSourceIssueCount: number
  inventoryDomainPresent: boolean
  revenueDomainPresent: boolean
  snapshotAgeDays: number | null
  compareDriftDetected: boolean
}

export type CloseChecklistInput = {
  period: CloseChecklistPeriodInput
  latestSnapshot: ReconciliationSnapshotHeader | null
  priorSnapshot?: ReconciliationSnapshotHeader | null
  snapshotPayload?: ReconciliationSnapshotPayloadV1 | null
  now?: string
  staleSnapshotThresholdDays?: number
}

export type CloseChecklistResult = {
  status: CloseReadinessStatus
  blockerCount: number
  warningCount: number
  items: CloseChecklistItem[]
  latestSnapshotRef: CloseChecklistSnapshotRef | null
  metrics: CloseChecklistMetrics
  period: CloseChecklistPeriodInput
}