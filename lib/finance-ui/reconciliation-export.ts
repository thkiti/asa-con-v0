import { rowsToCsvTable, sortByStableKey } from "./csv"
import {
  buildCompareMetadataRows,
  buildSnapshotExportSlug,
  buildSnapshotMetadataRows,
  formatExportAmount,
  formatExportTimestamp,
  type MetadataRow,
} from "./export-formatters"
import type { ReconciliationDashboardRow } from "./reconciliation"
import type { ReconciliationIssueRow } from "./reconciliation-issues"
import {
  downloadCsv,
  filterDashboardRowDiffs,
  filterIssueDiffs,
  formatAmountDelta,
  formatCountDelta,
  snapshotIssuesToUiRows,
  snapshotRowsToDashboardRows,
  type DashboardRowDiff,
  type IssueDiff,
  type SnapshotCompareResult,
  type SnapshotHeaderMetricCompare,
} from "./reconciliation-snapshots"
import type { ReconciliationSnapshotDetail } from "./types"

export const SNAPSHOT_METADATA_CSV_HEADERS = ["field", "value"] as const

export const SNAPSHOT_SUMMARY_CSV_HEADERS = [
  "metric",
  "value",
] as const

export const SNAPSHOT_DASHBOARD_CSV_HEADERS = [
  "rowId",
  "sourceType",
  "reference",
  "domain",
  "branchId",
  "periodLabel",
  "expectedAmount",
  "actualAmount",
  "variance",
  "status",
] as const

export const SNAPSHOT_ISSUES_CSV_HEADERS = [
  "issueId",
  "sourceType",
  "sourceId",
  "documentRef",
  "issueType",
  "severity",
  "status",
  "expectedAmount",
  "actualAmount",
  "difference",
  "message",
] as const

export const COMPARE_SUMMARY_CSV_HEADERS = [
  "metric",
  "leftValue",
  "rightValue",
  "delta",
] as const

export const COMPARE_DASHBOARD_DIFF_CSV_HEADERS = [
  "changeKind",
  "rowId",
  "reference",
  "domain",
  "changedFields",
  "leftExpectedAmount",
  "leftActualAmount",
  "leftVariance",
  "leftStatus",
  "rightExpectedAmount",
  "rightActualAmount",
  "rightVariance",
  "rightStatus",
] as const

export const COMPARE_ISSUE_DIFF_CSV_HEADERS = [
  "changeKind",
  "issueId",
  "documentRef",
  "issueType",
  "changedFields",
  "leftStatus",
  "leftSeverity",
  "leftMessage",
  "leftExpectedAmount",
  "leftActualAmount",
  "leftDifference",
  "rightStatus",
  "rightSeverity",
  "rightMessage",
  "rightExpectedAmount",
  "rightActualAmount",
  "rightDifference",
] as const

export type EvidenceCsvFile = {
  filename: string
  content: string
}

function metadataRowsToCsv(rows: MetadataRow[]): string {
  return rowsToCsvTable(SNAPSHOT_METADATA_CSV_HEADERS, rows)
}

function compareMetricRows(metrics: SnapshotHeaderMetricCompare): unknown[][] {
  return [
    [
      "matchedCount",
      metrics.matchedCount.left,
      metrics.matchedCount.right,
      formatCountDelta(metrics.matchedCount.delta),
    ],
    [
      "varianceCount",
      metrics.varianceCount.left,
      metrics.varianceCount.right,
      formatCountDelta(metrics.varianceCount.delta),
    ],
    [
      "issueCount",
      metrics.issueCount.left,
      metrics.issueCount.right,
      formatCountDelta(metrics.issueCount.delta),
    ],
    [
      "dashboardRowCount",
      metrics.dashboardRowCount.left,
      metrics.dashboardRowCount.right,
      formatCountDelta(metrics.dashboardRowCount.delta),
    ],
    [
      "totalVarianceAmount",
      formatExportAmount(String(metrics.totalVarianceAmount.left)),
      formatExportAmount(String(metrics.totalVarianceAmount.right)),
      formatAmountDelta(metrics.totalVarianceAmount.delta),
    ],
  ]
}

export function buildSnapshotMetadataCsv(
  snapshot: ReconciliationSnapshotDetail,
  exportedAt: string = formatExportTimestamp()
): string {
  return metadataRowsToCsv(buildSnapshotMetadataRows(snapshot, exportedAt))
}

export function buildSnapshotSummaryCsv(
  snapshot: ReconciliationSnapshotDetail,
  exportedAt: string = formatExportTimestamp()
): string {
  const { inventoryResult, salesResult } = snapshot.payload
  const rows: unknown[][] = [
    ["dashboardRowCount", snapshot.dashboardRowCount],
    ["matchedCount", snapshot.matchedCount],
    ["varianceCount", snapshot.varianceCount],
    ["issueCount", snapshot.issueCount],
    ["totalVarianceAmount", formatExportAmount(snapshot.totalVarianceAmount)],
    ["checkedSales", snapshot.checkedSales],
    ["checkedStockDocuments", snapshot.checkedStockDocuments],
    [
      "inventoryOperationalTotal",
      formatExportAmount(inventoryResult.operationalTotalValue),
    ],
    [
      "inventoryGlBalance",
      formatExportAmount(inventoryResult.glInventoryBalance),
    ],
    [
      "salesOperationalRevenue",
      formatExportAmount(salesResult.operationalRevenue),
    ],
    [
      "salesGlRevenueBalance",
      formatExportAmount(salesResult.glRevenueBalance),
    ],
    ["exportedAt", exportedAt],
  ]
  return rowsToCsvTable(SNAPSHOT_SUMMARY_CSV_HEADERS, rows)
}

export function buildSnapshotDashboardCsv(
  rows: ReconciliationDashboardRow[]
): string {
  const sorted = sortByStableKey(rows, (row) => row.id)
  const body = sorted.map((row) => [
    row.id,
    row.sourceType,
    row.reference,
    row.domain,
    row.branchId,
    row.periodLabel,
    formatExportAmount(row.expectedAmount),
    formatExportAmount(row.actualAmount),
    formatExportAmount(row.variance),
    row.status,
  ])
  return rowsToCsvTable(SNAPSHOT_DASHBOARD_CSV_HEADERS, body)
}

export function buildSnapshotIssuesCsv(
  issues: ReconciliationIssueRow[]
): string {
  const sorted = sortByStableKey(issues, (issue) => issue.id)
  const body = sorted.map((issue) => [
    issue.id,
    issue.sourceType,
    issue.sourceId,
    issue.documentRef,
    issue.issueType,
    issue.severity,
    issue.status,
    formatExportAmount(issue.expectedAmount),
    formatExportAmount(issue.actualAmount),
    formatExportAmount(issue.difference),
    issue.message,
  ])
  return rowsToCsvTable(SNAPSHOT_ISSUES_CSV_HEADERS, body)
}

export function buildCompareMetadataCsv(input: {
  left: ReconciliationSnapshotDetail
  right: ReconciliationSnapshotDetail
  exportedAt?: string
}): string {
  const exportedAt = input.exportedAt ?? formatExportTimestamp()
  return metadataRowsToCsv(
    buildCompareMetadataRows({
      left: input.left,
      right: input.right,
      exportedAt,
    })
  )
}

export function buildCompareSummaryCsv(input: {
  compare: SnapshotCompareResult
  exportedAt?: string
}): string {
  const exportedAt = input.exportedAt ?? formatExportTimestamp()
  const rows = [
    ...compareMetricRows(input.compare.metrics),
    ["exportedAt", "", "", exportedAt],
  ]
  return rowsToCsvTable(COMPARE_SUMMARY_CSV_HEADERS, rows)
}

export function buildCompareDashboardRowDiffCsv(
  diffs: DashboardRowDiff[],
  changesOnly = true
): string {
  const filtered = changesOnly ? filterDashboardRowDiffs(diffs, "all") : diffs
  const sorted = sortByStableKey(filtered, (diff) => diff.id)
  const body = sorted.map((diff) => {
    const left = diff.left
    const right = diff.right
    return [
      diff.kind,
      diff.id,
      right?.reference ?? left?.reference ?? diff.id,
      right?.domain ?? left?.domain ?? "",
      diff.changedFields?.join(";") ?? "",
      formatExportAmount(left?.expectedAmount),
      formatExportAmount(left?.actualAmount),
      formatExportAmount(left?.variance),
      left?.status ?? "",
      formatExportAmount(right?.expectedAmount),
      formatExportAmount(right?.actualAmount),
      formatExportAmount(right?.variance),
      right?.status ?? "",
    ]
  })
  return rowsToCsvTable(COMPARE_DASHBOARD_DIFF_CSV_HEADERS, body)
}

export function buildCompareIssueDiffCsv(
  diffs: IssueDiff[],
  changesOnly = true
): string {
  const filtered = changesOnly ? filterIssueDiffs(diffs, "all") : diffs
  const sorted = sortByStableKey(filtered, (diff) => diff.id)
  const body = sorted.map((diff) => {
    const left = diff.left
    const right = diff.right
    return [
      diff.kind,
      diff.id,
      right?.documentRef ?? left?.documentRef ?? diff.id,
      right?.issueType ?? left?.issueType ?? "",
      diff.changedFields?.join(";") ?? "",
      left?.status ?? "",
      left?.severity ?? "",
      left?.message ?? "",
      formatExportAmount(left?.expectedAmount),
      formatExportAmount(left?.actualAmount),
      formatExportAmount(left?.difference),
      right?.status ?? "",
      right?.severity ?? "",
      right?.message ?? "",
      formatExportAmount(right?.expectedAmount),
      formatExportAmount(right?.actualAmount),
      formatExportAmount(right?.difference),
    ]
  })
  return rowsToCsvTable(COMPARE_ISSUE_DIFF_CSV_HEADERS, body)
}

export function buildSnapshotEvidenceCsvFiles(input: {
  snapshot: ReconciliationSnapshotDetail
  dashboardRows: ReconciliationDashboardRow[]
  issues: ReconciliationIssueRow[]
  exportedAt?: string
}): EvidenceCsvFile[] {
  const exportedAt = input.exportedAt ?? formatExportTimestamp()
  const slug = buildSnapshotExportSlug(input.snapshot)
  return [
    {
      filename: `${slug}-metadata.csv`,
      content: buildSnapshotMetadataCsv(input.snapshot, exportedAt),
    },
    {
      filename: `${slug}-summary.csv`,
      content: buildSnapshotSummaryCsv(input.snapshot, exportedAt),
    },
    {
      filename: `${slug}-dashboard.csv`,
      content: buildSnapshotDashboardCsv(input.dashboardRows),
    },
    {
      filename: `${slug}-issues.csv`,
      content: buildSnapshotIssuesCsv(input.issues),
    },
  ]
}

export function buildSnapshotEvidenceExport(
  snapshot: ReconciliationSnapshotDetail,
  exportedAt?: string
): EvidenceCsvFile[] {
  return buildSnapshotEvidenceCsvFiles({
    snapshot,
    dashboardRows: snapshotRowsToDashboardRows(snapshot.payload.dashboardRows),
    issues: snapshotIssuesToUiRows(snapshot.payload.issuesPayload.issues),
    exportedAt,
  })
}

export async function downloadEvidenceCsvFiles(
  files: readonly EvidenceCsvFile[],
  delayMs = 200
): Promise<void> {
  for (const [index, file] of files.entries()) {
    downloadCsv(file.filename, file.content)
    if (index < files.length - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}

export function buildCompareEvidenceCsvFiles(input: {
  left: ReconciliationSnapshotDetail
  right: ReconciliationSnapshotDetail
  compare: SnapshotCompareResult
  exportedAt?: string
}): EvidenceCsvFile[] {
  const exportedAt = input.exportedAt ?? formatExportTimestamp()
  const slug = `${buildSnapshotExportSlug(input.left)}-vs-${buildSnapshotExportSlug(input.right)}`
  return [
    {
      filename: `${slug}-metadata.csv`,
      content: buildCompareMetadataCsv({
        left: input.left,
        right: input.right,
        exportedAt,
      }),
    },
    {
      filename: `${slug}-summary.csv`,
      content: buildCompareSummaryCsv({ compare: input.compare, exportedAt }),
    },
    {
      filename: `${slug}-dashboard-changes.csv`,
      content: buildCompareDashboardRowDiffCsv(input.compare.rowDiffs),
    },
    {
      filename: `${slug}-issue-changes.csv`,
      content: buildCompareIssueDiffCsv(input.compare.issueDiffs),
    },
  ]
}
