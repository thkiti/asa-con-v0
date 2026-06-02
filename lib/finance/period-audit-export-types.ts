import type { PeriodAuditTimelineItem } from "./period-audit-timeline-types"
import type { PeriodAuditTimelinePeriodSummary } from "./period-audit-timeline-types"

export const PERIOD_AUDIT_EXPORT_VERSION = 1 as const

export type PeriodAuditExportVersion = typeof PERIOD_AUDIT_EXPORT_VERSION

export type PeriodAuditCloseEvidenceSummary = {
  id: string
  periodId: string
  periodKey: string
  branchId: string
  closeMode: string
  closedAt: string
  closedByStaffId: string
  closedByName: string
  closedByRole: string
  readinessStatus: string
  gatePolicyKey: string
  reconciliationSnapshotId: string | null
  priorSnapshotId: string | null
  createdAt: string
}

export type PeriodAuditReopenEvidenceSummary = {
  id: string
  periodId: string
  periodKey: string
  branchId: string
  fromStatus: string
  toStatus: string
  reopenedAt: string
  reopenedByStaffId: string
  reopenedByName: string
  reopenedByRole: string
  reason: string
  closeEvidenceId: string | null
  requestNo: string | null
  createdAt: string
}

export type PeriodAuditReopenRequestSummary = {
  id: string
  requestNo: string
  periodId: string
  periodKey: string
  branchId: string
  fromStatus: string
  toStatus: string
  reason: string
  status: string
  requestedAt: string
  requestedByStaffId: string
  requestedByName: string
  requestedByRole: string
  approvedAt: string | null
  approvedByName: string | null
  approvedByRole: string | null
  approvalNote: string | null
  rejectedAt: string | null
  rejectedByName: string | null
  rejectedByRole: string | null
  rejectionNote: string | null
  cancelledAt: string | null
  cancelledByName: string | null
  cancelledByRole: string | null
  executedAt: string | null
  reopenEvidenceId: string | null
  closeEvidenceId: string | null
  createdAt: string
}

export type PeriodAuditExportCounts = {
  timelineEventCount: number
  closeEvidenceCount: number
  reopenEvidenceCount: number
  reopenRequestCount: number
}

export type PeriodAuditExportBundle = {
  exportVersion: PeriodAuditExportVersion
  exportedAt: string
  period: PeriodAuditTimelinePeriodSummary
  timeline: PeriodAuditTimelineItem[]
  closeEvidence: PeriodAuditCloseEvidenceSummary[]
  reopenEvidence: PeriodAuditReopenEvidenceSummary[]
  reopenRequests: PeriodAuditReopenRequestSummary[]
  counts: PeriodAuditExportCounts
}
