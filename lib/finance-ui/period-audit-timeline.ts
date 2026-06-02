export function buildPeriodAuditTimelinePath(periodId: string): string {
  return `/finance/periods/${encodeURIComponent(periodId.trim())}/timeline`
}

export type PeriodAuditTimelineApiResult = {
  period: {
    id: string
    periodKey: string
    branchId: string
    status: string
    openedAt: string
    closedAt: string | null
  }
  timeline: Array<{
    id: string
    type: string
    occurredAt: string
    actorId: string | null
    actorName: string | null
    title: string
    description: string
    source: string
    sourceId: string | null
    metadata: Record<string, string | number | boolean | null>
  }>
}
