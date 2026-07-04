import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { closingEntryNetIncomesMatch } from "./closing-entry-status"
import { classifyPeriodStatus } from "./close-policy"
import {
  CLOSE_BLOCKER_THRESHOLDS,
  getCloseBlockerRule,
  type CloseBlockerEvaluationContext,
  type CloseBlockerRuleId,
} from "./close-blocker-rules"
import type {
  CloseChecklistInput,
  CloseChecklistItem,
  CloseChecklistItemRef,
  CloseChecklistMetrics,
  CloseChecklistResult,
  CloseChecklistSeverity,
  CloseChecklistSnapshotRef,
  CloseChecklistIssueSummary,
  CloseReadinessStatus,
  CloseChecklistPeriodInput,
} from "./close-checklist-types"
import type {
  ReconciliationSnapshotHeader,
  SnapshotDashboardRow,
  SnapshotIssueRow,
} from "./reconciliation-snapshot-types"
import type { PeriodReconciliationReadinessSummary } from "./period-reconciliation-readiness"

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

export {
  CLOSE_BLOCKER_RULES,
  CLOSE_BLOCKER_THRESHOLDS,
  getCloseBlockerRule,
  sortCloseBlockerRuleIds,
  type CloseBlockerRuleDefinition,
  type CloseBlockerRuleId,
  type CloseBlockerThresholds,
} from "./close-blocker-rules"

export const DEFAULT_STALE_SNAPSHOT_THRESHOLD_DAYS =
  CLOSE_BLOCKER_THRESHOLDS.staleSnapshotDays

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
): { periodKeyMatch: boolean } {
  const periodKeyMatch =
    snapshot.periodKey === null || snapshot.periodKey === period.periodKey
  return { periodKeyMatch }
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

function periodRefs(period: CloseChecklistPeriodInput): CloseChecklistItemRef {
  return {
    periodKey: period.periodKey,
    branchId: period.branchId,
  }
}

function snapshotRefs(
  snapshotId: string,
  period: CloseChecklistPeriodInput,
  compareSnapshotId?: string
): CloseChecklistItemRef {
  return {
    snapshotId,
    compareSnapshotId,
    periodKey: period.periodKey,
    branchId: period.branchId,
  }
}

function makeChecklistItem(
  id: CloseBlockerRuleId,
  title: string,
  detail: string,
  refs?: CloseChecklistItemRef
): CloseChecklistItem {
  const rule = getCloseBlockerRule(id)
  return {
    id: rule.id,
    group: rule.group,
    severity: rule.severity,
    title,
    detail,
    refs,
  }
}

function appendPeriodReconciliationItems(
  items: CloseChecklistItem[],
  period: CloseChecklistPeriodInput,
  summary: PeriodReconciliationReadinessSummary | null
): void {
  if (!summary?.applies) {
    return
  }

  const refs = periodRefs(period)

  if (summary.bank.configuredAccounts.length === 0) {
    items.push(
      makeChecklistItem(
        "bank-reconciliation-not-configured",
        "No bank reconciliation accounts configured",
        "Mark one or more GL accounts with the bank reconciliation role in Chart of Accounts.",
        refs
      )
    )
  } else if (summary.bank.required) {
    if (summary.bank.missingWorksheetAccountCodes.length > 0) {
      items.push(
        makeChecklistItem(
          "bank-reconciliation-missing",
          "Bank reconciliation not started",
          `Create and confirm bank reconciliation for configured account(s): ${summary.bank.missingWorksheetAccountCodes.join(", ")}.`,
          refs
        )
      )
    } else if (
      summary.bank.incompleteWorksheetAccountCodes.length > 0 ||
      !summary.bank.completed
    ) {
      items.push(
        makeChecklistItem(
          "bank-reconciliation-incomplete",
          "Bank reconciliation not confirmed",
          `Bank reconciliation worksheet(s) exist but are not confirmed or locked for: ${summary.bank.incompleteWorksheetAccountCodes.join(", ") || "configured accounts"}.`,
          {
            ...refs,
            bankReconciliationId: summary.bank.records[0]?.id,
          }
        )
      )
    } else {
      const cashCheckCodes = summary.bank.completedViaBankCashCheckAccountCodes
      items.push(
        makeChecklistItem(
          "bank-reconciliation-complete",
          "Bank reconciliation confirmed",
          cashCheckCodes.length > 0
            ? `${cashCheckCodes.length} configured bank account(s) reconciled via Bank Cash Check (${cashCheckCodes.join(", ")}).`
            : `${summary.bank.configuredAccounts.length} configured bank account worksheet(s) confirmed for this period.`,
          refs
        )
      )
    }

    if (summary.bank.unresolvedVarianceCount > 0) {
      items.push(
        makeChecklistItem(
          "bank-reconciliation-variance",
          "Bank reconciliation variance unresolved",
          `${summary.bank.unresolvedVarianceCount} bank worksheet(s) have non-zero variance.`,
          refs
        )
      )
    }

    if (summary.bank.missingEvidenceCount > 0) {
      items.push(
        makeChecklistItem(
          "bank-reconciliation-evidence-missing",
          "Bank reconciliation evidence missing",
          `${summary.bank.missingEvidenceCount} bank worksheet(s) have no evidence note attached.`,
          refs
        )
      )
    }
  }

  if (summary.cash.configuredAccounts.length === 0) {
    items.push(
      makeChecklistItem(
        "cash-reconciliation-not-configured",
        "No cash reconciliation accounts configured",
        "Mark one or more GL accounts with the cash reconciliation role in Chart of Accounts.",
        refs
      )
    )
  } else if (summary.cash.required) {
    if (summary.cash.missingWorksheetAccountCodes.length > 0) {
      items.push(
        makeChecklistItem(
          "cash-reconciliation-missing",
          "Cash reconciliation not started",
          `Create and confirm branch cash reconciliation for configured account(s): ${summary.cash.missingWorksheetAccountCodes.join(", ")}.`,
          refs
        )
      )
    } else if (
      summary.cash.incompleteWorksheetAccountCodes.length > 0 ||
      !summary.cash.completed
    ) {
      items.push(
        makeChecklistItem(
          "cash-reconciliation-incomplete",
          "Cash reconciliation not confirmed",
          `Cash reconciliation worksheet(s) exist but are not confirmed or locked for: ${summary.cash.incompleteWorksheetAccountCodes.join(", ") || "configured accounts"}.`,
          {
            ...refs,
            cashReconciliationId: summary.cash.records[0]?.id,
          }
        )
      )
    } else {
      items.push(
        makeChecklistItem(
          "cash-reconciliation-complete",
          "Cash reconciliation confirmed",
          `${summary.cash.configuredAccounts.length} configured cash account worksheet(s) confirmed for this period.`,
          refs
        )
      )
    }

    if (summary.cash.unresolvedVarianceCount > 0) {
      items.push(
        makeChecklistItem(
          "cash-reconciliation-variance",
          "Cash reconciliation variance unresolved",
          `${summary.cash.unresolvedVarianceCount} cash worksheet(s) have non-zero variance.`,
          refs
        )
      )
    }

    if (summary.cash.missingEvidenceCount > 0) {
      items.push(
        makeChecklistItem(
          "cash-reconciliation-evidence-missing",
          "Cash reconciliation evidence missing",
          `${summary.cash.missingEvidenceCount} cash worksheet(s) have no evidence note attached.`,
          refs
        )
      )
    }
  }
}

export function evaluateCloseBlockerRules(
  context: CloseBlockerEvaluationContext
): CloseChecklistItem[] {
  const items: CloseChecklistItem[] = []
  const { period, latestSnapshot, priorSnapshot, issueSummary, dashboardRows } =
    context
  const statusLabel = classifyPeriodStatus(period.status)

  if (period.status === AccountingPeriodStatus.HARD_CLOSED) {
    items.push(
      makeChecklistItem(
        "posting-lock-hard-closed",
        "Period is hard closed",
        statusLabel.description,
        periodRefs(period)
      )
    )
  } else if (period.status === AccountingPeriodStatus.SOFT_CLOSED) {
    items.push(
      makeChecklistItem(
        "posting-lock-soft-closed",
        "Period is soft closed",
        "Routine posting is blocked. Review reconciliation evidence before hard close.",
        periodRefs(period)
      )
    )
  } else {
    items.push(
      makeChecklistItem(
        "posting-lock-open",
        "Period is open for posting",
        statusLabel.description,
        periodRefs(period)
      )
    )
  }

  if (
    period.status === AccountingPeriodStatus.HARD_CLOSED &&
    latestSnapshot &&
    period.closedAt &&
    parseIsoTime(latestSnapshot.createdAt) > parseIsoTime(period.closedAt)
  ) {
    items.push(
      makeChecklistItem(
        "period-hard-closed-snapshot-after-close",
        "Snapshot captured after hard close",
        `Latest snapshot ${latestSnapshot.id} was captured after the period hard close timestamp ${period.closedAt}.`,
        snapshotRefs(latestSnapshot.id, period)
      )
    )
  }

  appendPeriodReconciliationItems(
    items,
    period,
    context.periodReconciliation
  )

  if (!latestSnapshot) {
    items.push(
      makeChecklistItem(
        "snapshot-missing",
        "No reconciliation snapshot for period",
        "Capture a frozen reconciliation snapshot for this branch and period before close.",
        periodRefs(period)
      )
    )
    items.push(
      makeChecklistItem(
        "reconciliation-no-snapshot",
        "Reconciliation evidence unavailable",
        "Cannot evaluate transaction issues without a frozen snapshot.",
        periodRefs(period)
      )
    )
    items.push(
      makeChecklistItem(
        "audit-evidence-unavailable",
        "Evidence export unavailable",
        "Snapshot evidence CSV packs and audit print require a captured snapshot.",
        periodRefs(period)
      )
    )
    return items
  }

  const snapshotRef = toCloseChecklistSnapshotRef(latestSnapshot)
  const scopeMatch = snapshotScopeMatchesPeriod(latestSnapshot, period)

  items.push(
    makeChecklistItem(
      "snapshot-present",
      "Reconciliation snapshot captured",
      `Latest snapshot ${snapshotRef.id} captured at ${snapshotRef.createdAt}.`,
      snapshotRefs(snapshotRef.id, period)
    )
  )

  if (!scopeMatch.periodKeyMatch) {
    items.push(
      makeChecklistItem(
        "snapshot-period-mismatch",
        "Snapshot period does not match accounting period",
        `Snapshot period ${latestSnapshot.periodKey ?? "unknown"} does not match ${period.periodKey}.`,
        snapshotRefs(latestSnapshot.id, period)
      )
    )
  }

  const snapshotAgeDays = daysBetween(latestSnapshot.createdAt, context.nowIso)
  if (snapshotAgeDays > context.staleSnapshotThresholdDays) {
    items.push(
      makeChecklistItem(
        "snapshot-stale",
        "Snapshot may be stale",
        `Latest snapshot is ${snapshotAgeDays} days old (threshold ${context.staleSnapshotThresholdDays} days). Consider recapture before hard close.`,
        snapshotRefs(latestSnapshot.id, period)
      )
    )
  }

  if (
    priorSnapshot &&
    detectSnapshotHeaderDrift(priorSnapshot, latestSnapshot)
  ) {
    items.push(
      makeChecklistItem(
        "snapshot-compare-drift",
        "Snapshot metrics changed since prior capture",
        "Header metrics differ between the two most recent snapshots for this period.",
        snapshotRefs(latestSnapshot.id, period, priorSnapshot.id)
      )
    )
  }

  if (!hasDashboardDomain(dashboardRows, "inventory")) {
    items.push(
      makeChecklistItem(
        "snapshot-missing-inventory-domain",
        "Missing inventory reconciliation in snapshot",
        "Frozen snapshot dashboard has no inventory aggregate row for this scope.",
        snapshotRefs(latestSnapshot.id, period)
      )
    )
  }

  if (!hasDashboardDomain(dashboardRows, "revenue")) {
    items.push(
      makeChecklistItem(
        "snapshot-missing-revenue-domain",
        "Missing revenue reconciliation in snapshot",
        "Frozen snapshot dashboard has no revenue aggregate row for this scope.",
        snapshotRefs(latestSnapshot.id, period)
      )
    )
  }

  if (issueSummary.missingGlCount > 0) {
    items.push(
      makeChecklistItem(
        "reconciliation-missing-gl-issues",
        "Unresolved missing GL issues",
        `${issueSummary.missingGlCount} frozen issue(s) with MISSING_GL status must be resolved before close.`,
        snapshotRefs(latestSnapshot.id, period)
      )
    )
  }

  if (issueSummary.missingSourceCount > 0) {
    items.push(
      makeChecklistItem(
        "reconciliation-missing-source-issues",
        "Unresolved missing source issues",
        `${issueSummary.missingSourceCount} frozen issue(s) with MISSING_SOURCE status must be resolved before close.`,
        snapshotRefs(latestSnapshot.id, period)
      )
    )
  }

  if (context.metrics.varianceCount > 0) {
    items.push(
      makeChecklistItem(
        "reconciliation-dashboard-variance",
        "Aggregate reconciliation variances present",
        `${context.metrics.varianceCount} dashboard row(s) are not MATCHED in the frozen snapshot.`,
        snapshotRefs(latestSnapshot.id, period)
      )
    )
  }

  if (issueSummary.varianceStatusCount > 0) {
    items.push(
      makeChecklistItem(
        "reconciliation-issue-variance",
        "Transaction issue variances present",
        `${issueSummary.varianceStatusCount} frozen issue(s) have VARIANCE status.`,
        snapshotRefs(latestSnapshot.id, period)
      )
    )
  }

  if (
    context.metrics.issueCount === 0 &&
    context.metrics.varianceCount === 0 &&
    issueSummary.missingGlCount === 0 &&
    issueSummary.missingSourceCount === 0
  ) {
    items.push(
      makeChecklistItem(
        "reconciliation-clean",
        "Reconciliation snapshot is clean",
        `Frozen snapshot has ${context.metrics.matchedCount} matched dashboard row(s) and no open transaction issues.`,
        snapshotRefs(latestSnapshot.id, period)
      )
    )
  }

  items.push(
    makeChecklistItem(
      "audit-evidence-export-ready",
      "Evidence export available",
      "Frozen snapshot supports browser evidence CSV packs and audit print from snapshot detail.",
      snapshotRefs(latestSnapshot.id, period)
    )
  )

  items.push(
    makeChecklistItem(
      "audit-evidence-export-not-recorded",
      "Evidence export not recorded",
      "Export is client-side only; the system cannot verify that an evidence pack was downloaded.",
      snapshotRefs(latestSnapshot.id, period)
    )
  )

  if (context.closingEntry) {
    const { closingEntry } = context
    if (!closingEntry.isRequired) {
      items.push(
        makeChecklistItem(
          "closing-entry-not-required",
          "Closing entry not required",
          "No revenue or expense activity in this period; a closing entry is not required.",
          periodRefs(period)
        )
      )
    } else if (!closingEntry.activeEntry) {
      items.push(
        makeChecklistItem(
          "closing-entry-missing",
          "Closing entry not posted",
          "Revenue or expense activity exists but no active period closing entry was found.",
          periodRefs(period)
        )
      )
    } else if (
      !closingEntryNetIncomesMatch(
        closingEntry.currentNetIncome,
        closingEntry.activeEntry.netIncome
      )
    ) {
      items.push(
        makeChecklistItem(
          "closing-entry-stale",
          "Closing entry may be stale",
          `Current net income (${closingEntry.currentNetIncome}) differs from the posted closing entry (${closingEntry.activeEntry.netIncome}). Reverse and re-post before hard close.`,
          periodRefs(period)
        )
      )
      items.push(
        makeChecklistItem(
          "closing-entry-present",
          "Active closing entry posted",
          "An active period closing entry exists for this accounting period.",
          periodRefs(period)
        )
      )
    } else {
      items.push(
        makeChecklistItem(
          "closing-entry-present",
          "Closing entry posted",
          "An active period closing entry matches current period net income.",
          periodRefs(period)
        )
      )
    }
  }

  return items
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
    bankReconciliationCompleted: input.periodReconciliation?.applies
      ? input.periodReconciliation.bank.completed
      : null,
    cashReconciliationCompleted: input.periodReconciliation?.applies
      ? input.periodReconciliation.cash.completed
      : null,
    bankUnresolvedVarianceCount: input.periodReconciliation?.applies
      ? input.periodReconciliation.bank.unresolvedVarianceCount
      : null,
    cashUnresolvedVarianceCount: input.periodReconciliation?.applies
      ? input.periodReconciliation.cash.unresolvedVarianceCount
      : null,
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
  const staleSnapshotThresholdDays =
    input.staleSnapshotThresholdDays ?? DEFAULT_STALE_SNAPSHOT_THRESHOLD_DAYS
  const dashboardRows = resolveDashboardRows(input)
  const issueSummary = summarizeSnapshotIssues(resolveSnapshotIssues(input))
  const compareDriftDetected = Boolean(
    input.latestSnapshot &&
      input.priorSnapshot &&
      detectSnapshotHeaderDrift(input.priorSnapshot, input.latestSnapshot)
  )

  const items = sortCloseChecklistItems(
    evaluateCloseBlockerRules({
      period: input.period,
      latestSnapshot: input.latestSnapshot,
      priorSnapshot: input.priorSnapshot ?? null,
      issueSummary,
      dashboardRows,
      closingEntry: input.closingEntry ?? null,
      periodReconciliation: input.periodReconciliation ?? null,
      nowIso,
      staleSnapshotThresholdDays,
      metrics: {
        issueCount: input.latestSnapshot?.issueCount ?? 0,
        varianceCount: input.latestSnapshot?.varianceCount ?? 0,
        matchedCount: input.latestSnapshot?.matchedCount ?? 0,
      },
    })
  )

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