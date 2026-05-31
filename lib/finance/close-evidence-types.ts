import type { ClosePolicyRole } from "./close-policy"
import type {
  CloseChecklistIssueSummary,
  CloseChecklistMetrics,
  CloseChecklistSnapshotRef,
  CloseReadinessStatus,
} from "./close-checklist-types"

export const CLOSE_EVIDENCE_PAYLOAD_VERSION = 1 as const

export type CloseEvidencePayloadVersion = typeof CLOSE_EVIDENCE_PAYLOAD_VERSION

export type CloseActorSnapshot = {
  closedByStaffId: string
  closedByName: string
  closedByRole: ClosePolicyRole
}

export type CloseEvidenceChecklistItemSummary = {
  id: string
  group: string
  severity: string
  title: string
}

export type CloseEvidenceChecklistSummary = {
  status: CloseReadinessStatus
  blockerCount: number
  warningCount: number
  items: CloseEvidenceChecklistItemSummary[]
}

export type CloseEvidenceGateSummary = {
  policyKey: string
  rejectBlocked: boolean
  rejectWarnings: boolean
}

export type CloseEvidenceFinancialTotals = {
  operationalInventoryValue: string | null
  glInventoryBalance: string | null
  operationalRevenue: string | null
  glRevenueBalance: string | null
}

export type CloseEvidenceTraceabilityRefs = {
  reconciliationSnapshotId: string | null
  priorSnapshotId: string | null
  latestSnapshotRef: CloseChecklistSnapshotRef | null
  priorSnapshotRef: CloseChecklistSnapshotRef | null
  compareDriftDetected: boolean
  issueSummary: CloseChecklistIssueSummary
}

export type CloseEvidencePayloadV1 = {
  payloadVersion: CloseEvidencePayloadVersion
  period: {
    id: string
    branchId: string
    periodKey: string
    statusBefore: string
    statusAfter: string
    openedAt: string
    closedAt: string
  }
  close: CloseActorSnapshot & {
    mode: "HARD"
    closedAt: string
  }
  gate: CloseEvidenceGateSummary
  checklist: CloseEvidenceChecklistSummary
  reconciliationSummary: CloseChecklistMetrics
  financialTotals: CloseEvidenceFinancialTotals
  traceabilityRefs: CloseEvidenceTraceabilityRefs
}

export type CloseEvidenceDetail = {
  id: string
  periodId: string
  branchId: string
  periodKey: string
  closeMode: string
  closedAt: string
  closedByStaffId: string
  closedByName: string
  closedByRole: string
  readinessStatus: CloseReadinessStatus
  gatePolicyKey: string
  reconciliationSnapshotId: string | null
  priorSnapshotId: string | null
  payloadVersion: number
  payload: CloseEvidencePayloadV1
  createdAt: string
}
