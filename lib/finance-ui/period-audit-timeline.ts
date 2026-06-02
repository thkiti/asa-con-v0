export function buildPeriodAuditTimelinePath(periodId: string): string {
  return `/finance/periods/${encodeURIComponent(periodId.trim())}/timeline`
}

import type { PeriodAuditExportBundle } from "@/lib/finance/period-audit-export-types"
import type {
  PeriodAuditTimelineItem,
  PeriodAuditTimelinePeriodSummary,
} from "@/lib/finance/period-audit-timeline-types"

export type PeriodAuditTimelineApiResult = {
  period: PeriodAuditTimelinePeriodSummary
  timeline: PeriodAuditTimelineItem[]
}

export type PeriodAuditExportApiResult = {
  export: PeriodAuditExportBundle
}
