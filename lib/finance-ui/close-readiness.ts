import type {
  CloseChecklistGroup,
  CloseChecklistItem,
  CloseChecklistMetrics,
  CloseChecklistPeriodInput,
  CloseChecklistSnapshotRef,
  CloseReadinessStatus,
} from "@/lib/finance/close-checklist-types"

export type CloseReadinessResult = {
  status: CloseReadinessStatus
  blockerCount: number
  warningCount: number
  items: CloseChecklistItem[]
  latestSnapshotRef: CloseChecklistSnapshotRef | null
  priorSnapshotRef: CloseChecklistSnapshotRef | null
  metrics: CloseChecklistMetrics
  period: CloseChecklistPeriodInput
}

export type CloseReadinessApiResult = {
  readiness: CloseReadinessResult
}

export function buildCloseReadinessPath(periodId: string): string {
  return `/finance/periods/${encodeURIComponent(periodId)}/close-readiness`
}

export function formatCloseReadinessStatusLabel(
  status: CloseReadinessStatus
): string {
  switch (status) {
    case "READY":
      return "Ready"
    case "WARNING":
      return "Warning"
    case "BLOCKED":
      return "Blocked"
    default:
      return status
  }
}

export function formatCloseChecklistGroupLabel(group: CloseChecklistGroup): string {
  switch (group) {
    case "reconciliation":
      return "Reconciliation"
    case "snapshot_evidence":
      return "Snapshot evidence"
    case "posting_lock":
      return "Posting lock"
    case "audit_evidence":
      return "Audit evidence"
    default:
      return group
  }
}

export const CLOSE_CHECKLIST_GROUP_ORDER: CloseChecklistGroup[] = [
  "reconciliation",
  "snapshot_evidence",
  "posting_lock",
  "audit_evidence",
]

export function groupCloseChecklistItems(
  items: CloseChecklistItem[]
): Array<{ group: CloseChecklistGroup; items: CloseChecklistItem[] }> {
  const grouped = new Map<CloseChecklistGroup, CloseChecklistItem[]>()

  for (const group of CLOSE_CHECKLIST_GROUP_ORDER) {
    grouped.set(group, [])
  }

  for (const item of items) {
    const bucket = grouped.get(item.group)
    if (bucket) {
      bucket.push(item)
    }
  }

  return CLOSE_CHECKLIST_GROUP_ORDER.map((group) => ({
    group,
    items: grouped.get(group) ?? [],
  })).filter((entry) => entry.items.length > 0)
}