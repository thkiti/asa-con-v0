import type {
  AccountingPeriod,
  AccountingPeriodCloseEvidence,
  AccountingPeriodReopenEvidence,
  AccountingPeriodReopenRequest,
  PrismaClient,
} from "@/generated/prisma/client"
import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { FinancePostingError } from "./posting-errors"
import type {
  PeriodAuditTimelineItem,
  PeriodAuditTimelineResult,
} from "./period-audit-timeline-types"

export type PeriodAuditTimelinePrisma = Pick<
  PrismaClient,
  | "accountingPeriod"
  | "accountingPeriodCloseEvidence"
  | "accountingPeriodReopenEvidence"
  | "accountingPeriodReopenRequest"
>

function toIso(value: Date): string {
  return value.toISOString()
}

function compareTimelineItems(a: PeriodAuditTimelineItem, b: PeriodAuditTimelineItem): number {
  const timeDiff = a.occurredAt.localeCompare(b.occurredAt)
  if (timeDiff !== 0) return timeDiff
  return a.id.localeCompare(b.id)
}

function periodSummary(period: AccountingPeriod): PeriodAuditTimelineResult["period"] {
  return {
    id: period.id,
    periodKey: period.periodKey,
    branchId: period.branchId,
    status: period.status,
    openedAt: toIso(period.openedAt),
    closedAt: period.closedAt ? toIso(period.closedAt) : null,
  }
}

function buildPeriodOpenedItem(period: AccountingPeriod): PeriodAuditTimelineItem {
  return {
    id: `period-opened:${period.id}`,
    type: "period_opened",
    occurredAt: toIso(period.openedAt),
    actorId: null,
    actorName: null,
    title: "Period opened",
    description: `Accounting period ${period.periodKey} opened for posting.`,
    source: "period",
    sourceId: period.id,
    metadata: {
      periodKey: period.periodKey,
      branchId: period.branchId,
      status: period.status,
    },
  }
}

function buildPeriodSoftClosedItem(period: AccountingPeriod): PeriodAuditTimelineItem | null {
  if (period.status !== AccountingPeriodStatus.SOFT_CLOSED || !period.closedAt) {
    return null
  }

  return {
    id: `period-soft-closed:${period.id}`,
    type: "period_soft_closed",
    occurredAt: toIso(period.closedAt),
    actorId: null,
    actorName: null,
    title: "Period soft closed",
    description:
      "Period moved to SOFT_CLOSED. Actor and exact time are not stored in an immutable audit row.",
    source: "period",
    sourceId: period.id,
    metadata: {
      periodKey: period.periodKey,
      branchId: period.branchId,
      status: period.status,
    },
  }
}

function buildCloseEvidenceItems(row: AccountingPeriodCloseEvidence): PeriodAuditTimelineItem[] {
  const closedAt = toIso(row.closedAt)
  const evidenceCreatedAt = toIso(row.createdAt)
  const actorId = row.closedByStaffId
  const actorName = row.closedByName
  const metadata: PeriodAuditTimelineItem["metadata"] = {
    periodKey: row.periodKey,
    branchId: row.branchId,
    closeMode: row.closeMode,
    readinessStatus: row.readinessStatus,
    gatePolicyKey: row.gatePolicyKey,
  }

  return [
    {
      id: `period-hard-closed:${row.id}`,
      type: "period_hard_closed",
      occurredAt: closedAt,
      actorId,
      actorName,
      title: "Period hard closed",
      description: `HARD close completed (${row.readinessStatus} readiness).`,
      source: "close_evidence",
      sourceId: row.id,
      metadata,
    },
    {
      id: `close-evidence-generated:${row.id}`,
      type: "close_evidence_generated",
      occurredAt: evidenceCreatedAt,
      actorId,
      actorName,
      title: "Close evidence generated",
      description: "Immutable HARD-close audit record stored.",
      source: "close_evidence",
      sourceId: row.id,
      metadata,
    },
  ]
}

function buildReopenRequestItems(row: AccountingPeriodReopenRequest): PeriodAuditTimelineItem[] {
  const items: PeriodAuditTimelineItem[] = []
  const baseMetadata: PeriodAuditTimelineItem["metadata"] = {
    periodKey: row.periodKey,
    branchId: row.branchId,
    requestNo: row.requestNo,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    requestStatus: row.status,
  }

  items.push({
    id: `reopen-request:${row.id}:requested`,
    type: "reopen_requested",
    occurredAt: toIso(row.requestedAt),
    actorId: row.requestedByStaffId,
    actorName: row.requestedByName,
    title: "Reopen requested",
    description: `Request ${row.requestNo}: ${row.fromStatus} - ${row.toStatus}. ${row.reason}`,
    source: "reopen_request",
    sourceId: row.id,
    metadata: baseMetadata,
  })

  if (row.approvedAt) {
    items.push({
      id: `reopen-request:${row.id}:approved`,
      type: "reopen_approved",
      occurredAt: toIso(row.approvedAt),
      actorId: row.approvedByStaffId,
      actorName: row.approvedByName,
      title: "Reopen approved",
      description: row.approvalNote?.trim()
        ? `Approved: ${row.approvalNote.trim()}`
        : `Request ${row.requestNo} approved.`,
      source: "reopen_request",
      sourceId: row.id,
      metadata: {
        ...baseMetadata,
        executedAt: row.executedAt ? toIso(row.executedAt) : null,
        reopenEvidenceId: row.reopenEvidenceId,
      },
    })
  }

  if (row.rejectedAt) {
    items.push({
      id: `reopen-request:${row.id}:rejected`,
      type: "reopen_rejected",
      occurredAt: toIso(row.rejectedAt),
      actorId: row.rejectedByStaffId,
      actorName: row.rejectedByName,
      title: "Reopen rejected",
      description: row.rejectionNote?.trim()
        ? `Rejected: ${row.rejectionNote.trim()}`
        : `Request ${row.requestNo} rejected.`,
      source: "reopen_request",
      sourceId: row.id,
      metadata: baseMetadata,
    })
  }

  if (row.cancelledAt) {
    items.push({
      id: `reopen-request:${row.id}:canceled`,
      type: "reopen_canceled",
      occurredAt: toIso(row.cancelledAt),
      actorId: row.cancelledByStaffId,
      actorName: row.cancelledByName,
      title: "Reopen canceled",
      description: `Request ${row.requestNo} canceled by requester.`,
      source: "reopen_request",
      sourceId: row.id,
      metadata: baseMetadata,
    })
  }

  return items
}

function buildReopenEvidenceItem(row: AccountingPeriodReopenEvidence): PeriodAuditTimelineItem {
  const payload = row.payload as {
    reopenRequestId?: string | null
    approval?: { requestNo?: string } | null
  } | null

  const requestNo =
    payload?.approval?.requestNo?.trim() ||
    (payload?.reopenRequestId ? `request ${payload.reopenRequestId}` : null)

  const descriptionParts = [
    `${row.fromStatus} - ${row.toStatus}`,
    row.reason.trim(),
  ]
  if (requestNo) {
    descriptionParts.unshift(requestNo)
  }

  return {
    id: `period-reopened:${row.id}`,
    type: "period_reopened",
    occurredAt: toIso(row.reopenedAt),
    actorId: row.reopenedByStaffId,
    actorName: row.reopenedByName,
    title: "Period reopened",
    description: descriptionParts.filter(Boolean).join("  |  "),
    source: "reopen_evidence",
    sourceId: row.id,
    metadata: {
      periodKey: row.periodKey,
      branchId: row.branchId,
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
      closeEvidenceId: row.closeEvidenceId,
      reopenRequestId: payload?.reopenRequestId ?? null,
      requestNo: payload?.approval?.requestNo ?? null,
    },
  }
}

type PeriodWithRelations = AccountingPeriod & {
  closeEvidence: AccountingPeriodCloseEvidence[]
  reopenEvidence: AccountingPeriodReopenEvidence[]
  reopenRequests: AccountingPeriodReopenRequest[]
}

export async function getPeriodAuditTimelineByPeriodId(
  prisma: PeriodAuditTimelinePrisma,
  periodId: string
): Promise<PeriodAuditTimelineResult> {
  const trimmedId = periodId.trim()
  if (!trimmedId) {
    throw new FinancePostingError(
      "Accounting period id is required",
      "PERIOD_NOT_FOUND"
    )
  }

  const period = (await prisma.accountingPeriod.findUnique({
    where: { id: trimmedId },
    include: {
      closeEvidence: { orderBy: { closedAt: "asc" } },
      reopenEvidence: { orderBy: { reopenedAt: "asc" } },
      reopenRequests: { orderBy: { requestedAt: "asc" } },
    },
  })) as PeriodWithRelations | null

  if (!period) {
    throw new FinancePostingError(
      `Accounting period not found: ${trimmedId}`,
      "PERIOD_NOT_FOUND"
    )
  }

  const softClosed = buildPeriodSoftClosedItem(period)
  const timeline: PeriodAuditTimelineItem[] = [
    buildPeriodOpenedItem(period),
    ...(softClosed ? [softClosed] : []),
    ...period.closeEvidence.flatMap(buildCloseEvidenceItems),
    ...period.reopenRequests.flatMap(buildReopenRequestItems),
    ...period.reopenEvidence.map(buildReopenEvidenceItem),
  ]

  timeline.sort(compareTimelineItems)

  return {
    period: periodSummary(period),
    timeline,
  }
}
