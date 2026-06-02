import type { PeriodAuditExportBundle } from "@/lib/finance/period-audit-export-types"
import type { PeriodAuditTimelineItem } from "@/lib/finance/period-audit-timeline-types"
import { rowsToCsvTable, sortByStableKey } from "./csv"
import {
  formatExportBranchId,
  formatExportIsoDateTime,
  formatExportTimestamp,
  type MetadataRow,
} from "./export-formatters"

export type PeriodAuditCsvFile = {
  filename: string
  content: string
}

export const PERIOD_AUDIT_TIMELINE_CSV_HEADERS = [
  "occurredAt",
  "eventType",
  "title",
  "description",
  "actorId",
  "actorName",
  "source",
  "sourceId",
  "requestNo",
  "fromStatus",
  "toStatus",
  "closeMode",
  "readinessStatus",
] as const

export const PERIOD_AUDIT_REPORT_METADATA_HEADERS = ["field", "value"] as const

export const PERIOD_AUDIT_CLOSE_EVIDENCE_INDEX_HEADERS = [
  "id",
  "closeMode",
  "closedAt",
  "closedByStaffId",
  "closedByName",
  "closedByRole",
  "readinessStatus",
  "gatePolicyKey",
  "reconciliationSnapshotId",
  "priorSnapshotId",
  "createdAt",
] as const

export const PERIOD_AUDIT_REOPEN_EVIDENCE_HEADERS = [
  "id",
  "fromStatus",
  "toStatus",
  "reopenedAt",
  "reopenedByStaffId",
  "reopenedByName",
  "reopenedByRole",
  "reason",
  "closeEvidenceId",
  "requestNo",
  "createdAt",
] as const

export const PERIOD_AUDIT_REOPEN_REQUEST_HEADERS = [
  "requestNo",
  "status",
  "fromStatus",
  "toStatus",
  "reason",
  "requestedAt",
  "requestedByName",
  "requestedByRole",
  "approvedAt",
  "approvedByName",
  "approvalNote",
  "rejectedAt",
  "rejectedByName",
  "rejectionNote",
  "cancelledAt",
  "cancelledByName",
  "executedAt",
  "reopenEvidenceId",
  "closeEvidenceId",
  "createdAt",
] as const

function metadataString(
  metadata: PeriodAuditTimelineItem["metadata"],
  key: string
): string {
  const value = metadata[key]
  if (value === null || value === undefined) {
    return ""
  }
  return String(value)
}

export function buildPeriodAuditExportSlug(
  bundle: Pick<PeriodAuditExportBundle, "period">
): string {
  const branch = bundle.period.branchId.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
  const period = bundle.period.periodKey.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
  const base = `period-audit-${branch}-${period}`.replace(/^-|-$/g, "")
  return base || bundle.period.id.slice(0, 8)
}

export function buildPeriodAuditTimelineCsv(bundle: PeriodAuditExportBundle): string {
  const rows = bundle.timeline.map((item) => [
    formatExportIsoDateTime(item.occurredAt),
    item.type,
    item.title,
    item.description,
    item.actorId ?? "",
    item.actorName ?? "",
    item.source,
    item.sourceId ?? "",
    metadataString(item.metadata, "requestNo"),
    metadataString(item.metadata, "fromStatus"),
    metadataString(item.metadata, "toStatus"),
    metadataString(item.metadata, "closeMode"),
    metadataString(item.metadata, "readinessStatus"),
  ])
  return rowsToCsvTable(PERIOD_AUDIT_TIMELINE_CSV_HEADERS, rows)
}

export function buildPeriodAuditReportMetadataRows(
  bundle: PeriodAuditExportBundle
): MetadataRow[] {
  const { period, counts } = bundle
  return [
    ["exportType", "accounting_period_audit_report"],
    ["exportVersion", String(bundle.exportVersion)],
    ["periodId", period.id],
    ["periodKey", period.periodKey],
    ["branchId", formatExportBranchId(period.branchId)],
    ["status", period.status],
    ["openedAt", formatExportIsoDateTime(period.openedAt)],
    ["closedAt", period.closedAt ? formatExportIsoDateTime(period.closedAt) : ""],
    ["timelineEventCount", String(counts.timelineEventCount)],
    ["closeEvidenceCount", String(counts.closeEvidenceCount)],
    ["reopenEvidenceCount", String(counts.reopenEvidenceCount)],
    ["reopenRequestCount", String(counts.reopenRequestCount)],
    ["exportedAt", bundle.exportedAt],
  ]
}

export function buildPeriodAuditReportMetadataCsv(
  bundle: PeriodAuditExportBundle
): string {
  return rowsToCsvTable(
    PERIOD_AUDIT_REPORT_METADATA_HEADERS,
    buildPeriodAuditReportMetadataRows(bundle)
  )
}

export function buildPeriodAuditCloseEvidenceIndexCsv(
  bundle: PeriodAuditExportBundle
): string {
  const sorted = sortByStableKey(bundle.closeEvidence, (row) => row.closedAt)
  const rows = sorted.map((row) => [
    row.id,
    row.closeMode,
    formatExportIsoDateTime(row.closedAt),
    row.closedByStaffId,
    row.closedByName,
    row.closedByRole,
    row.readinessStatus,
    row.gatePolicyKey,
    row.reconciliationSnapshotId ?? "",
    row.priorSnapshotId ?? "",
    formatExportIsoDateTime(row.createdAt),
  ])
  return rowsToCsvTable(PERIOD_AUDIT_CLOSE_EVIDENCE_INDEX_HEADERS, rows)
}

export function buildPeriodAuditReopenEvidenceCsv(
  bundle: PeriodAuditExportBundle
): string {
  const sorted = sortByStableKey(bundle.reopenEvidence, (row) => row.reopenedAt)
  const rows = sorted.map((row) => [
    row.id,
    row.fromStatus,
    row.toStatus,
    formatExportIsoDateTime(row.reopenedAt),
    row.reopenedByStaffId,
    row.reopenedByName,
    row.reopenedByRole,
    row.reason,
    row.closeEvidenceId ?? "",
    row.requestNo ?? "",
    formatExportIsoDateTime(row.createdAt),
  ])
  return rowsToCsvTable(PERIOD_AUDIT_REOPEN_EVIDENCE_HEADERS, rows)
}

export function buildPeriodAuditReopenRequestsCsv(
  bundle: PeriodAuditExportBundle
): string {
  const sorted = sortByStableKey(bundle.reopenRequests, (row) => row.requestedAt)
  const rows = sorted.map((row) => [
    row.requestNo,
    row.status,
    row.fromStatus,
    row.toStatus,
    row.reason,
    formatExportIsoDateTime(row.requestedAt),
    row.requestedByName,
    row.requestedByRole,
    row.approvedAt ? formatExportIsoDateTime(row.approvedAt) : "",
    row.approvedByName ?? "",
    row.approvalNote ?? "",
    row.rejectedAt ? formatExportIsoDateTime(row.rejectedAt) : "",
    row.rejectedByName ?? "",
    row.rejectionNote ?? "",
    row.cancelledAt ? formatExportIsoDateTime(row.cancelledAt) : "",
    row.cancelledByName ?? "",
    row.executedAt ? formatExportIsoDateTime(row.executedAt) : "",
    row.reopenEvidenceId ?? "",
    row.closeEvidenceId ?? "",
    formatExportIsoDateTime(row.createdAt),
  ])
  return rowsToCsvTable(PERIOD_AUDIT_REOPEN_REQUEST_HEADERS, rows)
}

export function buildPeriodAuditExport(
  bundle: PeriodAuditExportBundle,
  exportedAt: string = formatExportTimestamp()
): PeriodAuditCsvFile[] {
  const slug = buildPeriodAuditExportSlug(bundle)
  const bundleWithExportTime: PeriodAuditExportBundle = {
    ...bundle,
    exportedAt: bundle.exportedAt || exportedAt,
  }

  return [
    {
      filename: `${slug}-report-metadata.csv`,
      content: buildPeriodAuditReportMetadataCsv(bundleWithExportTime),
    },
    {
      filename: `${slug}-timeline-events.csv`,
      content: buildPeriodAuditTimelineCsv(bundleWithExportTime),
    },
    {
      filename: `${slug}-close-evidence-index.csv`,
      content: buildPeriodAuditCloseEvidenceIndexCsv(bundleWithExportTime),
    },
    {
      filename: `${slug}-reopen-evidence.csv`,
      content: buildPeriodAuditReopenEvidenceCsv(bundleWithExportTime),
    },
    {
      filename: `${slug}-reopen-requests.csv`,
      content: buildPeriodAuditReopenRequestsCsv(bundleWithExportTime),
    },
  ]
}
