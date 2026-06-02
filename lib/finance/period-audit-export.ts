import type { PrismaClient } from "@/generated/prisma/client"
import type { CloseEvidenceDetail } from "./close-evidence-types"
import { listCloseEvidenceByPeriodId } from "./close-evidence"
import { getPeriodAuditTimelineByPeriodId } from "./period-audit-timeline"
import type { PeriodAuditTimelinePrisma } from "./period-audit-timeline"
import { listReopenEvidenceByPeriodId } from "./reopen-evidence"
import type { ReopenEvidenceDetail } from "./reopen-evidence-types"
import { listReopenRequestsByPeriodId } from "./reopen-request"
import type { ReopenRequestDetail } from "./reopen-request-types"
import {
  PERIOD_AUDIT_EXPORT_VERSION,
  type PeriodAuditCloseEvidenceSummary,
  type PeriodAuditExportBundle,
  type PeriodAuditReopenEvidenceSummary,
  type PeriodAuditReopenRequestSummary,
} from "./period-audit-export-types"

export type PeriodAuditExportPrisma = PeriodAuditTimelinePrisma &
  Pick<PrismaClient, "accountingPeriodCloseEvidence" | "accountingPeriodReopenEvidence" | "accountingPeriodReopenRequest">

function toExportIso(): string {
  return new Date().toISOString()
}

function toCloseEvidenceSummary(row: CloseEvidenceDetail): PeriodAuditCloseEvidenceSummary {
  return {
    id: row.id,
    periodId: row.periodId,
    periodKey: row.periodKey,
    branchId: row.branchId,
    closeMode: row.closeMode,
    closedAt: row.closedAt,
    closedByStaffId: row.closedByStaffId,
    closedByName: row.closedByName,
    closedByRole: row.closedByRole,
    readinessStatus: row.readinessStatus,
    gatePolicyKey: row.gatePolicyKey,
    reconciliationSnapshotId: row.reconciliationSnapshotId,
    priorSnapshotId: row.priorSnapshotId,
    createdAt: row.createdAt,
  }
}

function toReopenEvidenceSummary(row: ReopenEvidenceDetail): PeriodAuditReopenEvidenceSummary {
  const payload = row.payload

  return {
    id: row.id,
    periodId: row.periodId,
    periodKey: row.periodKey,
    branchId: row.branchId,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    reopenedAt: row.reopenedAt,
    reopenedByStaffId: row.reopenedByStaffId,
    reopenedByName: row.reopenedByName,
    reopenedByRole: row.reopenedByRole,
    reason: row.reason,
    closeEvidenceId: row.closeEvidenceId,
    requestNo: payload?.approval?.requestNo ?? null,
    createdAt: row.createdAt,
  }
}

function toReopenRequestSummary(row: ReopenRequestDetail): PeriodAuditReopenRequestSummary {
  return {
    id: row.id,
    requestNo: row.requestNo,
    periodId: row.periodId,
    periodKey: row.periodKey,
    branchId: row.branchId,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    reason: row.reason,
    status: row.status,
    requestedAt: row.requestedAt,
    requestedByStaffId: row.requestedByStaffId,
    requestedByName: row.requestedByName,
    requestedByRole: row.requestedByRole,
    approvedAt: row.approvedAt,
    approvedByName: row.approvedByName,
    approvedByRole: row.approvedByRole,
    approvalNote: row.approvalNote,
    rejectedAt: row.rejectedAt,
    rejectedByName: row.rejectedByName,
    rejectedByRole: row.rejectedByRole,
    rejectionNote: row.rejectionNote,
    cancelledAt: row.cancelledAt,
    cancelledByName: row.cancelledByName,
    cancelledByRole: row.cancelledByRole,
    executedAt: row.executedAt,
    reopenEvidenceId: row.reopenEvidenceId,
    closeEvidenceId: row.closeEvidenceId,
    createdAt: row.createdAt,
  }
}

export async function getPeriodAuditExportByPeriodId(
  prisma: PeriodAuditExportPrisma,
  periodId: string
): Promise<PeriodAuditExportBundle> {
  const timelineResult = await getPeriodAuditTimelineByPeriodId(prisma, periodId)

  const [closeEvidenceRows, reopenEvidenceRows, reopenRequestRows] = await Promise.all([
    listCloseEvidenceByPeriodId(prisma, periodId),
    listReopenEvidenceByPeriodId(prisma, periodId),
    listReopenRequestsByPeriodId(prisma, periodId),
  ])

  const closeEvidence = closeEvidenceRows.map(toCloseEvidenceSummary)
  const reopenEvidence = reopenEvidenceRows.map(toReopenEvidenceSummary)
  const reopenRequests = reopenRequestRows.map(toReopenRequestSummary)

  return {
    exportVersion: PERIOD_AUDIT_EXPORT_VERSION,
    exportedAt: toExportIso(),
    period: timelineResult.period,
    timeline: timelineResult.timeline,
    closeEvidence,
    reopenEvidence,
    reopenRequests,
    counts: {
      timelineEventCount: timelineResult.timeline.length,
      closeEvidenceCount: closeEvidence.length,
      reopenEvidenceCount: reopenEvidence.length,
      reopenRequestCount: reopenRequests.length,
    },
  }
}
