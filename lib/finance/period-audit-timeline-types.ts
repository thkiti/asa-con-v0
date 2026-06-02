export type PeriodAuditTimelineEventType =
  | "period_opened"
  | "period_soft_closed"
  | "period_hard_closed"
  | "close_evidence_generated"
  | "reopen_requested"
  | "reopen_approved"
  | "reopen_rejected"
  | "reopen_canceled"
  | "period_reopened"

export type PeriodAuditTimelineSource =
  | "period"
  | "close_evidence"
  | "reopen_evidence"
  | "reopen_request"

export type PeriodAuditTimelineItem = {
  id: string
  type: PeriodAuditTimelineEventType
  occurredAt: string
  actorId: string | null
  actorName: string | null
  title: string
  description: string
  source: PeriodAuditTimelineSource
  sourceId: string | null
  metadata: Record<string, string | number | boolean | null>
}

export type PeriodAuditTimelinePeriodSummary = {
  id: string
  periodKey: string
  branchId: string
  status: string
  openedAt: string
  closedAt: string | null
}

export type PeriodAuditTimelineResult = {
  period: PeriodAuditTimelinePeriodSummary
  timeline: PeriodAuditTimelineItem[]
}
