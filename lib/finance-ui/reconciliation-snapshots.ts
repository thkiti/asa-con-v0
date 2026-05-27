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
import type { ReconciliationIssueRow } from "./types"

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
