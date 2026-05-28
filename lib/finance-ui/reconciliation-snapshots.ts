import { issueMatchesDomain } from "@/lib/finance/reconciliation-issue-row-filters"
import type {
  SnapshotDashboardRow,
  SnapshotIssueRow,
} from "@/lib/finance/reconciliation-snapshot-types"
import {
  buildApiFilter,
  periodKeyToDateRange,
  rowsToCsv,
  type ReconciliationDashboardFilter,
  type ReconciliationDashboardRow,
} from "./reconciliation"
import { issuesToCsv } from "./reconciliation-issues"
import type {
  ReconciliationIssueRow,
  ReconciliationSnapshotDetail,
  ReconciliationSnapshotHeader,
} from "./types"



export type SnapshotScopeFields = Pick<
  ReconciliationSnapshotHeader,
  "periodKey" | "fromDate" | "toDate"
>

export function formatSnapshotScope(snapshot: SnapshotScopeFields): string {
  if (snapshot.periodKey) {
    return snapshot.periodKey
  }
  if (snapshot.fromDate && snapshot.toDate) {
    return `${snapshot.fromDate.slice(0, 10)} → ${snapshot.toDate.slice(0, 10)}`
  }
  return "All dates"
}

export function formatSnapshotDisplayTitle(snapshot: ReconciliationSnapshotHeader): string {
  const label = snapshot.label?.trim()
  if (label) return label
  return formatSnapshotScope(snapshot)
}

export function formatSnapshotKindLabel(
  kind: ReconciliationSnapshotHeader["kind"]
): string {
  switch (kind) {
    case "MANUAL":
      return "Manual"
    default:
      return kind
  }
}
export type SnapshotCaptureOptions = {
  label?: string
  note?: string
}

export type SnapshotCaptureBody = {
  branchId?: string
  periodKey?: string
  from?: string
  to?: string
  label?: string
  note?: string
}

export function canCaptureSnapshotScope(
  filter: ReconciliationDashboardFilter
): boolean {
  const periodKey = filter.periodKey?.trim()
  if (periodKey && periodKeyToDateRange(periodKey)) {
    return true
  }

  const apiFilter = buildApiFilter(filter)
  return Boolean(apiFilter.from?.trim() && apiFilter.to?.trim())
}

export function buildSnapshotCaptureBody(
  filter: ReconciliationDashboardFilter,
  options: SnapshotCaptureOptions = {}
): SnapshotCaptureBody {
  const body: SnapshotCaptureBody = {}

  const branchId = filter.branchId?.trim()
  if (branchId) {
    body.branchId = branchId
  }

  const label = options.label?.trim()
  if (label) {
    body.label = label
  }

  const note = options.note?.trim()
  if (note) {
    body.note = note
  }

  const periodKey = filter.periodKey?.trim()
  if (periodKey && periodKeyToDateRange(periodKey)) {
    body.periodKey = periodKey
    return body
  }

  const apiFilter = buildApiFilter(filter)
  if (apiFilter.from?.trim() && apiFilter.to?.trim()) {
    body.from = apiFilter.from.trim()
    body.to = apiFilter.to.trim()
  }

  return body
}

export function snapshotRowsToDashboardRows(
  rows: SnapshotDashboardRow[]
): ReconciliationDashboardRow[] {
  return rows.map((row) => ({ ...row }))
}

export function snapshotIssuesToUiRows(
  issues: SnapshotIssueRow[]
): ReconciliationIssueRow[] {
  return issues.map((issue) => ({
    id: issue.id,
    sourceType: issue.sourceType,
    sourceId: issue.sourceId,
    documentRef: issue.documentRef,
    issueType: issue.issueType,
    severity: issue.severity,
    status: issue.status,
    message: issue.message,
    expectedAmount: issue.expectedAmount,
    actualAmount: issue.actualAmount,
    difference: issue.difference,
    vouchers: issue.vouchers.map((voucher) => ({ ...voucher })),
    journalEntries: issue.journalEntries.map((journal) => ({ ...journal })),
    sourceCreatedAt: issue.sourceCreatedAt,
    sourcePostedAt: issue.sourcePostedAt,
  }))
}

export function filterFrozenIssuesByDomain(
  issues: ReconciliationIssueRow[],
  domain: string | undefined
): ReconciliationIssueRow[] {
  return issues.filter((issue) => issueMatchesDomain(issue, domain))
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportFrozenDashboardCsv(
  rows: ReconciliationDashboardRow[],
  filename = "reconciliation-snapshot-dashboard.csv"
): void {
  if (rows.length === 0) {
    return
  }
  downloadCsv(filename, rowsToCsv(rows))
}

export function exportFrozenIssuesCsv(
  issues: ReconciliationIssueRow[],
  filename = "reconciliation-snapshot-issues.csv"
): void {
  if (issues.length === 0) {
    return
  }
  downloadCsv(filename, issuesToCsv(issues))
}


export type SnapshotMetricCompare = {
  left: number | string
  right: number | string
  delta: number
}

export type SnapshotHeaderMetricCompare = {
  matchedCount: SnapshotMetricCompare
  varianceCount: SnapshotMetricCompare
  issueCount: SnapshotMetricCompare
  dashboardRowCount: SnapshotMetricCompare
  totalVarianceAmount: SnapshotMetricCompare
}

export type DashboardRowDiffKind = "added" | "removed" | "changed" | "unchanged"

export type DashboardRowDiff = {
  kind: DashboardRowDiffKind
  id: string
  left?: ReconciliationDashboardRow
  right?: ReconciliationDashboardRow
  changedFields?: string[]
}

export type IssueDiffKind = "added" | "removed" | "changed" | "unchanged"

export type IssueDiff = {
  kind: IssueDiffKind
  id: string
  left?: ReconciliationIssueRow
  right?: ReconciliationIssueRow
  changedFields?: string[]
}

const DASHBOARD_ROW_COMPARE_FIELDS = [
  "expectedAmount",
  "actualAmount",
  "variance",
  "status",
] as const satisfies ReadonlyArray<keyof ReconciliationDashboardRow>

const ISSUE_COMPARE_FIELDS = [
  "status",
  "severity",
  "message",
  "expectedAmount",
  "actualAmount",
  "difference",
] as const satisfies ReadonlyArray<keyof ReconciliationIssueRow>

function parseSnapshotAmount(value: string): number {
  const num = Number(value)
  return Number.isNaN(num) ? 0 : num
}

export function formatCountDelta(delta: number): string {
  if (delta === 0) return "0"
  return delta > 0 ? `+${delta}` : String(delta)
}

export function formatAmountDelta(delta: number): string {
  if (Math.abs(delta) < 0.005) return "0.00"
  const sign = delta > 0 ? "+" : ""
  return `${sign}${delta.toFixed(2)}`
}

export function compareSnapshotHeaderMetrics(
  left: ReconciliationSnapshotHeader,
  right: ReconciliationSnapshotHeader
): SnapshotHeaderMetricCompare {
  return {
    matchedCount: {
      left: left.matchedCount,
      right: right.matchedCount,
      delta: right.matchedCount - left.matchedCount,
    },
    varianceCount: {
      left: left.varianceCount,
      right: right.varianceCount,
      delta: right.varianceCount - left.varianceCount,
    },
    issueCount: {
      left: left.issueCount,
      right: right.issueCount,
      delta: right.issueCount - left.issueCount,
    },
    dashboardRowCount: {
      left: left.dashboardRowCount,
      right: right.dashboardRowCount,
      delta: right.dashboardRowCount - left.dashboardRowCount,
    },
    totalVarianceAmount: {
      left: left.totalVarianceAmount,
      right: right.totalVarianceAmount,
      delta:
        parseSnapshotAmount(right.totalVarianceAmount) -
        parseSnapshotAmount(left.totalVarianceAmount),
    },
  }
}

function dashboardRowFieldsEqual(
  left: ReconciliationDashboardRow,
  right: ReconciliationDashboardRow
): boolean {
  return DASHBOARD_ROW_COMPARE_FIELDS.every((field) => left[field] === right[field])
}

function issueFieldsEqual(
  left: ReconciliationIssueRow,
  right: ReconciliationIssueRow
): boolean {
  return ISSUE_COMPARE_FIELDS.every((field) => left[field] === right[field])
}

export function diffDashboardRows(
  leftRows: ReconciliationDashboardRow[],
  rightRows: ReconciliationDashboardRow[]
): DashboardRowDiff[] {
  const leftMap = new Map(leftRows.map((row) => [row.id, row]))
  const rightMap = new Map(rightRows.map((row) => [row.id, row]))
  const allIds = [...new Set([...leftMap.keys(), ...rightMap.keys()])].sort()

  return allIds.map((id) => {
    const left = leftMap.get(id)
    const right = rightMap.get(id)

    if (left && !right) {
      return { kind: "removed", id, left }
    }
    if (!left && right) {
      return { kind: "added", id, right }
    }
    if (left && right) {
      if (dashboardRowFieldsEqual(left, right)) {
        return { kind: "unchanged", id, left, right }
      }
      const changedFields = DASHBOARD_ROW_COMPARE_FIELDS.filter(
        (field) => left[field] !== right[field]
      )
      return { kind: "changed", id, left, right, changedFields: [...changedFields] }
    }
    return { kind: "unchanged", id }
  })
}

export function diffSnapshotIssues(
  leftIssues: ReconciliationIssueRow[],
  rightIssues: ReconciliationIssueRow[]
): IssueDiff[] {
  const leftMap = new Map(leftIssues.map((issue) => [issue.id, issue]))
  const rightMap = new Map(rightIssues.map((issue) => [issue.id, issue]))
  const allIds = [...new Set([...leftMap.keys(), ...rightMap.keys()])].sort()

  return allIds.map((id) => {
    const left = leftMap.get(id)
    const right = rightMap.get(id)

    if (left && !right) {
      return { kind: "removed", id, left }
    }
    if (!left && right) {
      return { kind: "added", id, right }
    }
    if (left && right) {
      if (issueFieldsEqual(left, right)) {
        return { kind: "unchanged", id, left, right }
      }
      const changedFields = ISSUE_COMPARE_FIELDS.filter(
        (field) => left[field] !== right[field]
      )
      return { kind: "changed", id, left, right, changedFields: [...changedFields] }
    }
    return { kind: "unchanged", id }
  })
}

export function filterDashboardRowDiffs(
  diffs: DashboardRowDiff[],
  kind: "all" | DashboardRowDiffKind
): DashboardRowDiff[] {
  if (kind === "all") {
    return diffs.filter((diff) => diff.kind !== "unchanged")
  }
  return diffs.filter((diff) => diff.kind === kind)
}

export function filterIssueDiffs(
  diffs: IssueDiff[],
  kind: "all" | IssueDiffKind
): IssueDiff[] {
  if (kind === "all") {
    return diffs.filter((diff) => diff.kind !== "unchanged")
  }
  return diffs.filter((diff) => diff.kind === kind)
}

export function countDashboardRowDiffs(diffs: DashboardRowDiff[]) {
  return {
    added: diffs.filter((diff) => diff.kind === "added").length,
    removed: diffs.filter((diff) => diff.kind === "removed").length,
    changed: diffs.filter((diff) => diff.kind === "changed").length,
    unchanged: diffs.filter((diff) => diff.kind === "unchanged").length,
  }
}

export function countIssueDiffs(diffs: IssueDiff[]) {
  return {
    added: diffs.filter((diff) => diff.kind === "added").length,
    removed: diffs.filter((diff) => diff.kind === "removed").length,
    changed: diffs.filter((diff) => diff.kind === "changed").length,
    unchanged: diffs.filter((diff) => diff.kind === "unchanged").length,
  }
}


export const SNAPSHOT_UI_ISSUES_PAGE_SIZE = 50

export type PaginatedListResult<T> = {
  visible: T[]
  total: number
  hasMore: boolean
  nextVisibleCount: number
}

export function paginateList<T>(
  items: T[],
  visibleCount: number,
  pageSize: number = SNAPSHOT_UI_ISSUES_PAGE_SIZE
): PaginatedListResult<T> {
  const safeCount = Math.max(pageSize, visibleCount)
  const visible = items.slice(0, safeCount)
  return {
    visible,
    total: items.length,
    hasMore: items.length > visible.length,
    nextVisibleCount: Math.min(items.length, safeCount + pageSize),
  }
}

export type SnapshotCompareResult = {
  leftRows: ReconciliationDashboardRow[]
  rightRows: ReconciliationDashboardRow[]
  leftIssues: ReconciliationIssueRow[]
  rightIssues: ReconciliationIssueRow[]
  metrics: SnapshotHeaderMetricCompare
  rowDiffs: DashboardRowDiff[]
  issueDiffs: IssueDiff[]
  rowCounts: ReturnType<typeof countDashboardRowDiffs>
  issueCounts: ReturnType<typeof countIssueDiffs>
}

export function computeSnapshotCompareResult(
  left: ReconciliationSnapshotDetail,
  right: ReconciliationSnapshotDetail
): SnapshotCompareResult {
  const leftRows = snapshotRowsToDashboardRows(left.payload.dashboardRows)
  const rightRows = snapshotRowsToDashboardRows(right.payload.dashboardRows)
  const leftIssues = snapshotIssuesToUiRows(left.payload.issuesPayload.issues)
  const rightIssues = snapshotIssuesToUiRows(right.payload.issuesPayload.issues)
  const rowDiffs = diffDashboardRows(leftRows, rightRows)
  const issueDiffs = diffSnapshotIssues(leftIssues, rightIssues)

  return {
    leftRows,
    rightRows,
    leftIssues,
    rightIssues,
    metrics: compareSnapshotHeaderMetrics(left, right),
    rowDiffs,
    issueDiffs,
    rowCounts: countDashboardRowDiffs(rowDiffs),
    issueCounts: countIssueDiffs(issueDiffs),
  }
}
