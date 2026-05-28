import type {
  CloseChecklistIssueSummary,
  CloseChecklistPeriodInput,
} from "./close-checklist-types"
import type {
  ReconciliationSnapshotHeader,
  SnapshotDashboardRow,
} from "./reconciliation-snapshot-types"

export type CloseBlockerEvaluationContext = {
  period: CloseChecklistPeriodInput
  latestSnapshot: ReconciliationSnapshotHeader | null
  priorSnapshot: ReconciliationSnapshotHeader | null
  issueSummary: CloseChecklistIssueSummary
  dashboardRows: SnapshotDashboardRow[]
  nowIso: string
  staleSnapshotThresholdDays: number
  metrics: {
    issueCount: number
    varianceCount: number
    matchedCount: number
  }
}
import type {
  CloseChecklistGroup,
  CloseChecklistSeverity,
} from "./close-checklist-types"

export const CLOSE_BLOCKER_THRESHOLDS = {
  staleSnapshotDays: 7,
} as const

export type CloseBlockerThresholds = typeof CLOSE_BLOCKER_THRESHOLDS

export type CloseBlockerRuleId =
  | "posting-lock-open"
  | "posting-lock-soft-closed"
  | "posting-lock-hard-closed"
  | "snapshot-missing"
  | "snapshot-present"
  | "snapshot-branch-mismatch"
  | "snapshot-period-mismatch"
  | "snapshot-stale"
  | "snapshot-compare-drift"
  | "snapshot-missing-inventory-domain"
  | "snapshot-missing-revenue-domain"
  | "reconciliation-no-snapshot"
  | "reconciliation-missing-gl-issues"
  | "reconciliation-missing-source-issues"
  | "reconciliation-dashboard-variance"
  | "reconciliation-issue-variance"
  | "reconciliation-clean"
  | "audit-evidence-unavailable"
  | "audit-evidence-export-ready"
  | "audit-evidence-export-not-recorded"
  | "period-hard-closed-snapshot-after-close"

export type CloseBlockerRuleDefinition = {
  id: CloseBlockerRuleId
  group: CloseChecklistGroup
  severity: CloseChecklistSeverity
  order: number
}

export const CLOSE_BLOCKER_RULES: CloseBlockerRuleDefinition[] = [
  { id: "reconciliation-missing-gl-issues", group: "reconciliation", severity: "BLOCKED", order: 10 },
  { id: "reconciliation-missing-source-issues", group: "reconciliation", severity: "BLOCKED", order: 11 },
  { id: "reconciliation-no-snapshot", group: "reconciliation", severity: "BLOCKED", order: 12 },
  { id: "snapshot-missing", group: "snapshot_evidence", severity: "BLOCKED", order: 20 },
  { id: "snapshot-branch-mismatch", group: "snapshot_evidence", severity: "BLOCKED", order: 21 },
  { id: "snapshot-period-mismatch", group: "snapshot_evidence", severity: "BLOCKED", order: 22 },
  { id: "snapshot-missing-inventory-domain", group: "snapshot_evidence", severity: "BLOCKED", order: 23 },
  { id: "snapshot-missing-revenue-domain", group: "snapshot_evidence", severity: "BLOCKED", order: 24 },
  { id: "period-hard-closed-snapshot-after-close", group: "posting_lock", severity: "BLOCKED", order: 25 },
  { id: "posting-lock-soft-closed", group: "posting_lock", severity: "WARNING", order: 30 },
  { id: "snapshot-stale", group: "snapshot_evidence", severity: "WARNING", order: 31 },
  { id: "snapshot-compare-drift", group: "snapshot_evidence", severity: "WARNING", order: 32 },
  { id: "reconciliation-dashboard-variance", group: "reconciliation", severity: "WARNING", order: 33 },
  { id: "reconciliation-issue-variance", group: "reconciliation", severity: "WARNING", order: 34 },
  { id: "audit-evidence-unavailable", group: "audit_evidence", severity: "WARNING", order: 35 },
  { id: "audit-evidence-export-not-recorded", group: "audit_evidence", severity: "WARNING", order: 36 },
  { id: "posting-lock-hard-closed", group: "posting_lock", severity: "INFO", order: 40 },
  { id: "posting-lock-open", group: "posting_lock", severity: "PASS", order: 50 },
  { id: "snapshot-present", group: "snapshot_evidence", severity: "PASS", order: 51 },
  { id: "reconciliation-clean", group: "reconciliation", severity: "PASS", order: 52 },
  { id: "audit-evidence-export-ready", group: "audit_evidence", severity: "PASS", order: 53 },
]

const RULE_BY_ID = new Map(
  CLOSE_BLOCKER_RULES.map((rule) => [rule.id, rule] as const)
)

export function getCloseBlockerRule(
  id: CloseBlockerRuleId
): CloseBlockerRuleDefinition {
  const rule = RULE_BY_ID.get(id)
  if (!rule) {
    throw new Error(`Unknown close blocker rule: ${id}`)
  }
  return rule
}

export function sortCloseBlockerRuleIds(ids: CloseBlockerRuleId[]): CloseBlockerRuleId[] {
  return [...ids].sort((left, right) => {
    const leftRule = getCloseBlockerRule(left)
    const rightRule = getCloseBlockerRule(right)
    return leftRule.order - rightRule.order || left.localeCompare(right)
  })
}