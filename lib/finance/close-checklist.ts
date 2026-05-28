import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { classifyPeriodStatus } from "./close-policy"
import type {
  CloseChecklistInput,
  CloseChecklistItem,
  CloseChecklistMetrics,
  CloseChecklistResult,
  CloseChecklistSeverity,
  CloseChecklistSnapshotRef,
  CloseChecklistIssueSummary,
  CloseReadinessStatus,
} from "./close-checklist-types"
import type {
  ReconciliationSnapshotHeader,
  SnapshotDashboardRow,
  SnapshotIssueRow,
} from "./reconciliation-snapshot-types"

export type {
  CloseChecklistGroup,
  CloseChecklistInput,
  CloseChecklistItem,
  CloseChecklistItemRef,
  CloseChecklistIssueSummary,
  CloseChecklistMetrics,
  CloseChecklistPeriodInput,
  CloseChecklistResult,
  CloseChecklistSeverity,
  CloseChecklistSnapshotRef,
  CloseReadinessStatus,
} from "./close-checklist-types"

export const DEFAULT_STALE_SNAPSHOT_THRESHOLD_DAYS = 7

const SEVERITY_ORDER: Record<CloseChecklistSeverity, number> = {
  BLOCKED: 0,
  WARNING: 1,
  INFO: 2,
  PASS: 3,
}

const GROUP_ORDER = {
  reconciliation: 0,
  snapshot_evidence: 1,
  posting_lock: 2,
  audit_evidence: 3,
} as const

const MS_PER_DAY = 86_400_000

function parseIsoTime(value: string): number {
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : Date.now()
}

function daysBetween(olderIso: string, newerIso: string): number {
  const delta = parseIsoTime(newerIso) - parseIsoTime(olderIso)
  return Math.max(0, Math.floor(delta / MS_PER_DAY))
}

export function toCloseChecklistSnapshotRef(
  snapshot: ReconciliationSnapshotHeader
): CloseChecklistSnapshotRef {
  return {
    id: snapshot.id,
    createdAt: snapshot.createdAt,
    periodKey: snapshot.periodKey,
    branchId: snapshot.branchId,
    label: snapshot.label,
  }
}

export function summarizeSnapshotIssues(
  issues: SnapshotIssueRow[]
): CloseChecklistIssueSummary {
  let missingGlCount = 0
  let missingSourceCount = 0
  let varianceStatusCount = 0
  let errorSeverityCount = 0

  for (const issue of issues) {
    if (issue.status === "MISSING_GL") {
      missingGlCount += 1
    } else if (issue.status === "MISSING_SOURCE") {
      missingSourceCount += 1
    } else if (issue.status === "VARIANCE") {
      varianceStatusCount += 1
    }

    if (issue.severity === "ERROR") {
      errorSeverityCount += 1
    }
  }

  return {
    totalCount: issues.length,
    missingGlCount,
    missingSourceCount,
    varianceStatusCount,
    errorSeverityCount,
  }
}

export function hasDashboardDomain(
  rows: SnapshotDashboardRow[],
  domain: string
): boolean {
  const normalized = domain.trim().toLowerCase()
  return rows.some((row) => row.domain.trim().toLowerCase() === normalized)
}

export function snapshotScopeMatchesPeriod(
  snapshot: ReconciliationSnapshotHeader,
  period: CloseChecklistInput["period"]
): { branchMatch: boolean; periodKeyMatch: boolean } {
  const branchMatch =
    snapshot.branchId === null || snapshot.branchId === period.branchId
  const periodKeyMatch =
    snapshot.periodKey === null || snapshot.periodKey === period.periodKey
  return { branchMatch, periodKeyMatch }
}

export function detectSnapshotHeaderDrift(
  prior: ReconciliationSnapshotHeader,
  latest: ReconciliationSnapshotHeader
): boolean {
  return (
    prior.issueCount !== latest.issueCount ||
    prior.varianceCount !== latest.varianceCount ||
    prior.matchedCount !== latest.matchedCount ||
    prior.dashboardRowCount !== latest.dashboardRowCount ||
    prior.totalVarianceAmount !== latest.totalVarianceAmount
  )
}

export function sortCloseChecklistItems(
  items: CloseChecklistItem[]
): CloseChecklistItem[] {
  return [...items].sort((left, right) => {
    const severityDelta =
      SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity]
    if (severityDelta !== 0) {
      return severityDelta
    }

    const groupDelta = GROUP_ORDER[left.group] - GROUP_ORDER[right.group]
    if (groupDelta !== 0) {
      return groupDelta
    }

    return left.id.localeCompare(right.id)
  })
}

export function countChecklistSeverities(items: CloseChecklistItem[]): {
  blockerCount: number
  warningCount: number
} {
  let blockerCount = 0
  let warningCount = 0

  for (const item of items) {
    if (item.severity === "BLOCKED") {
      blockerCount += 1
    } else if (item.severity === "WARNING") {
      warningCount += 1
    }
  }

  return { blockerCount, warningCount }
}

export function resolveCloseReadinessStatus(
  items: CloseChecklistItem[]
): CloseReadinessStatus {
  const { blockerCount, warningCount } = countChecklistSeverities(items)
  if (blockerCount > 0) {
    return "BLOCKED"
  }
  if (warningCount > 0) {
    return "WARNING"
  }
  return "READY"
}

function buildPostingLockItems(
  period: CloseChecklistInput["period"]
): CloseChecklistItem[] {
  const statusLabel = classifyPeriodStatus(period.status)

  if (period.status === AccountingPeriodStatus.HARD_CLOSED) {
    return [
      {
        id: "posting-lock-hard-closed",
        group: "posting_lock",
        severity: "INFO",
        title: "Period is hard closed",
        detail: statusLabel.description,
        refs: {
          periodKey: period.periodKey,
          branchId: period.branchId,
        },
      },
    ]
  }

  if (period.status === AccountingPeriodStatus.SOFT_CLOSED) {
    return [
      {
        id: "posting-lock-soft-closed",
        group: "posting_lock",
        severity: "WARNING",
        title: "Period is soft closed",
        detail:
          "Routine posting is blocked. Review reconciliation evidence before hard close.",
        refs: {
          periodKey: period.periodKey,
          branchId: period.branchId,
        },
      },
    ]
  }

  return [
    {
      id: "posting-lock-open",
      group: "posting_lock",
      severity: "PASS",
      title: "Period is open for posting",
      detail: statusLabel.description,
      refs: {
        periodKey: period.periodKey,
        branchId: period.branchId,
      },
    },
  ]
}

function buildSnapshotEvidenceItems(
  input: CloseChecklistInput,
  nowIso: string,
  staleThresholdDays: number,
  dashboardRows: SnapshotDashboardRow[]
): CloseChecklistItem[] {
  const { period, latestSnapshot, priorSnapshot } = input
  const items: CloseChecklistItem[] = []

  if (!latestSnapshot) {
    items.push({
      id: "snapshot-missing",
      group: "snapshot_evidence",
      severity: "BLOCKED",
      title: "No reconciliation snapshot for period",
      detail:
        "Capture a frozen reconciliation snapshot for this branch and period before close.",
      refs: {
        periodKey: period.periodKey,
        branchId: period.branchId,
      },
    })
    return items
  }

  const snapshotRef = toCloseChecklistSnapshotRef(latestSnapshot)
  const scopeMatch = snapshotScopeMatchesPeriod(latestSnapshot, period)

  items.push({
    id: "snapshot-present",
    group: "snapshot_evidence",
    severity: "PASS",
    title: "Reconciliation snapshot captured",
    detail: `Latest snapshot ${snapshotRef.id} captured at ${snapshotRef.createdAt}.`,
    refs: {
      snapshotId: snapshotRef.id,
      periodKey: period.periodKey,
      branchId: period.branchId,
    },
  })

  if (!scopeMatch.branchMatch) {
    items.push({
      id: "snapshot-branch-mismatch",
      group: "snapshot_evidence",
      severity: "BLOCKED",
      title: "Snapshot branch does not match period",
      detail: `Snapshot branch ${latestSnapshot.branchId ?? "unknown"} does not match period branch ${period.branchId}.`,
      refs: {
        snapshotId: latestSnapshot.id,
        periodKey: period.periodKey,
        branchId: period.branchId,
      },
    })
  }

  if (!scopeMatch.periodKeyMatch) {
    items.push({
      id: "snapshot-period-mismatch",
      group: "snapshot_evidence",
      severity: "BLOCKED",
      title: "Snapshot period does not match accounting period",
      detail: `Snapshot period ${latestSnapshot.periodKey ?? "unknown"} does not match ${period.periodKey}.`,
      refs: {
        snapshotId: latestSnapshot.id,
        periodKey: period.periodKey,
        branchId: period.branchId,
      },
    })
  }

  const snapshotAgeDays = daysBetween(latestSnapshot.createdAt, nowIso)
  if (snapshotAgeDays > staleThresholdDays) {
    items.push({
      id: "snapshot-stale",
      group: "snapshot_evidence",
      severity: "WARNING",
      title: "Snapshot may be stale",
      detail: `Latest snapshot is ${snapshotAgeDays} days old (threshold ${staleThresholdDays} days). Consider recapture before hard close.`,
      refs: {
        snapshotId: latestSnapshot.id,
        periodKey: period.periodKey,
        branchId: period.branchId,
      },
    })
  }

  if (priorSnapshot && detectSnapshotHeaderDrift(priorSnapshot, latestSnapshot)) {
    items.push({
      id: "snapshot-compare-drift",
      group: "snapshot_evidence",
      severity: "WARNING",
      title: "Snapshot metrics changed since prior capture",
      detail:
        "Header metrics differ between the two most recent snapshots for this period.",
      refs: {
        snapshotId: latestSnapshot.id,
        compareSnapshotId: priorSnapshot.id,
        periodKey: period.periodKey,
        branchId: period.branchId,
      },
    })
  }

  if (!hasDashboardDomain(dashboardRows, "inventory")) {
    items.push({
      id: "snapshot-missing-inventory-domain",
      group: "snapshot_evidence",
      severity: "BLOCKED",
      title: "Missing inventory reconciliation in snapshot",
      detail:
        "Frozen snapshot dashboard has no inventory aggregate row for this scope.",
      refs: {
        snapshotId: latestSnapshot.id,
        periodKey: period.periodKey,
        branchId: period.branchId,
      },
    })
  }

  if (!hasDashboardDomain(dashboardRows, "revenue")) {
    items.push({
      id: "snapshot-missing-revenue-domain",
      group: "snapshot_evidence",
      severity: "BLOCKED",
      title: "Missing revenue reconciliation in snapshot",
      detail:
        "Frozen snapshot dashboard has no revenue aggregate row for this scope.",
      refs: {
        snapshotId: latestSnapshot.id,
        periodKey: period.periodKey,
        branchId: period.branchId,
      },
    })
  }

  return items
}

function buildReconciliationItems(
  input: CloseChecklistInput,
  issueSummary: CloseChecklistIssueSummary,
  metrics: Pick<
    CloseChecklistMetrics,
    "issueCount" | "varianceCount" | "matchedCount"
  >
): CloseChecklistItem[] {
  const { period, latestSnapshot } = input
  const items: CloseChecklistItem[] = []
  const snapshotId = latestSnapshot?.id

  if (!latestSnapshot) {
    items.push({
      id: "reconciliation-no-snapshot",
      group: "reconciliation",
      severity: "BLOCKED",
      title: "Reconciliation evidence unavailable",
      detail: "Cannot evaluate transaction issues without a frozen snapshot.",
      refs: {
        periodKey: period.periodKey,
        branchId: period.branchId,
      },
    })
    return items
  }

  if (issueSummary.missingGlCount > 0) {
    items.push({
      id: "reconciliation-missing-gl-issues",
      group: "reconciliation",
      severity: "BLOCKED",
      title: "Unresolved missing GL issues",
      detail: `${issueSummary.missingGlCount} frozen issue(s) with MISSING_GL status must be resolved before close.`,
      refs: {
        snapshotId,
        periodKey: period.periodKey,
        branchId: period.branchId,
      },
    })
  }

  if (issueSummary.missingSourceCount > 0) {
    items.push({
      id: "reconciliation-missing-source-issues",
      group: "reconciliation",
      severity: "BLOCKED",
      title: "Unresolved missing source issues",
      detail: `${issueSummary.missingSourceCount} frozen issue(s) with MISSING_SOURCE status must be resolved before close.`,
      refs: {
        snapshotId,
        periodKey: period.periodKey,
        branchId: period.branchId,
      },
    })
  }

  if (metrics.varianceCount > 0) {
    items.push({
      id: "reconciliation-dashboard-variance",
      group: "reconciliation",
      severity: "WARNING",
      title: "Aggregate reconciliation variances present",
      detail: `${metrics.varianceCount} dashboard row(s) are not MATCHED in the frozen snapshot.`,
      refs: {
        snapshotId,
        periodKey: period.periodKey,
        branchId: period.branchId,
      },
    })
  }

  if (issueSummary.varianceStatusCount > 0) {
    items.push({
      id: "reconciliation-issue-variance",
      group: "reconciliation",
      severity: "WARNING",
      title: "Transaction issue variances present",
      detail: `${issueSummary.varianceStatusCount} frozen issue(s) have VARIANCE status.`,
      refs: {
        snapshotId,
        periodKey: period.periodKey,
        branchId: period.branchId,
      },
    })
  }

  if (
    metrics.issueCount === 0 &&
    metrics.varianceCount === 0 &&
    issueSummary.missingGlCount === 0 &&
    issueSummary.missingSourceCount === 0
  ) {
    items.push({
      id: "reconciliation-clean",
      group: "reconciliation",
      severity: "PASS",
      title: "Reconciliation snapshot is clean",
      detail: `Frozen snapshot has ${metrics.matchedCount} matched dashboard row(s) and no open transaction issues.`,
      refs: {
        snapshotId,
        periodKey: period.periodKey,
        branchId: period.branchId,
      },
    })
  }

  return items
}

function buildAuditEvidenceItems(
  input: CloseChecklistInput
): CloseChecklistItem[] {
  const { period, latestSnapshot } = input

  if (!latestSnapshot) {
    return [
      {
        id: "audit-evidence-unavailable",
        group: "audit_evidence",
        severity: "WARNING",
        title: "Evidence export unavailable",
        detail:
          "Snapshot evidence CSV packs and audit print require a captured snapshot.",
        refs: {
          periodKey: period.periodKey,
          branchId: period.branchId,
        },
      },
    ]
  }

  return [
    {
      id: "audit-evidence-export-ready",
      group: "audit_evidence",
      severity: "PASS",
      title: "Evidence export available",
      detail:
        "Frozen snapshot supports browser evidence CSV packs and audit print from snapshot detail.",
      refs: {
        snapshotId: latestSnapshot.id,
        periodKey: period.periodKey,
        branchId: period.branchId,
      },
    },
    {
      id: "audit-evidence-export-not-recorded",
      group: "audit_evidence",
      severity: "WARNING",
      title: "Evidence export not recorded",
      detail:
        "Export is client-side only; the system cannot verify that an evidence pack was downloaded.",
      refs: {
        snapshotId: latestSnapshot.id,
        periodKey: period.periodKey,
        branchId: period.branchId,
      },
    },
  ]
}

function buildCloseChecklistMetrics(
  input: CloseChecklistInput,
  issueSummary: CloseChecklistIssueSummary,
  dashboardRows: SnapshotDashboardRow[],
  nowIso: string,
  compareDriftDetected: boolean
): CloseChecklistMetrics {
  const latest = input.latestSnapshot

  return {
    issueCount: latest?.issueCount ?? 0,
    varianceCount: latest?.varianceCount ?? 0,
    matchedCount: latest?.matchedCount ?? 0,
    dashboardRowCount: latest?.dashboardRowCount ?? 0,
    totalVarianceAmount: latest?.totalVarianceAmount ?? null,
    missingGlIssueCount: issueSummary.missingGlCount,
    missingSourceIssueCount: issueSummary.missingSourceCount,
    inventoryDomainPresent: hasDashboardDomain(dashboardRows, "inventory"),
    revenueDomainPresent: hasDashboardDomain(dashboardRows, "revenue"),
    snapshotAgeDays: latest ? daysBetween(latest.createdAt, nowIso) : null,
    compareDriftDetected,
  }
}

function resolveDashboardRows(
  input: CloseChecklistInput
): SnapshotDashboardRow[] {
  return input.snapshotPayload?.dashboardRows ?? []
}

function resolveSnapshotIssues(
  input: CloseChecklistInput
): SnapshotIssueRow[] {
  return input.snapshotPayload?.issuesPayload.issues ?? []
}

export function buildCloseChecklist(
  input: CloseChecklistInput
): CloseChecklistResult {
  const nowIso = input.now ?? new Date().toISOString()
  const staleThresholdDays =
    input.staleSnapshotThresholdDays ?? DEFAULT_STALE_SNAPSHOT_THRESHOLD_DAYS
  const dashboardRows = resolveDashboardRows(input)
  const issueSummary = summarizeSnapshotIssues(resolveSnapshotIssues(input))
  const compareDriftDetected = Boolean(
    input.latestSnapshot &&
      input.priorSnapshot &&
      detectSnapshotHeaderDrift(input.priorSnapshot, input.latestSnapshot)
  )

  const items = sortCloseChecklistItems([
    ...buildPostingLockItems(input.period),
    ...buildSnapshotEvidenceItems(
      input,
      nowIso,
      staleThresholdDays,
      dashboardRows
    ),
    ...buildReconciliationItems(input, issueSummary, {
      issueCount: input.latestSnapshot?.issueCount ?? 0,
      varianceCount: input.latestSnapshot?.varianceCount ?? 0,
      matchedCount: input.latestSnapshot?.matchedCount ?? 0,
    }),
    ...buildAuditEvidenceItems(input),
  ])

  const { blockerCount, warningCount } = countChecklistSeverities(items)

  return {
    status: resolveCloseReadinessStatus(items),
    blockerCount,
    warningCount,
    items,
    latestSnapshotRef: input.latestSnapshot
      ? toCloseChecklistSnapshotRef(input.latestSnapshot)
      : null,
    metrics: buildCloseChecklistMetrics(
      input,
      issueSummary,
      dashboardRows,
      nowIso,
      compareDriftDetected
    ),
    period: input.period,
  }
}