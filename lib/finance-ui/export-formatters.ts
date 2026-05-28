import {
  formatSnapshotDisplayTitle,
  formatSnapshotKindLabel,
  formatSnapshotScope,
} from "./reconciliation-snapshots"
import type { ReconciliationSnapshotHeader } from "./types"

/** ISO-8601 for audit CSV fields (deterministic, not locale-dependent). */
export function formatExportTimestamp(date: Date = new Date()): string {
  return date.toISOString()
}

export function formatExportIsoDateTime(
  value: string | null | undefined
): string {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return parsed.toISOString()
}

/** Fixed two-decimal string for CSV amounts (audit consistency). */
export function formatExportAmount(
  value: string | number | null | undefined
): string {
  if (value === null || value === undefined || value === "") {
    return ""
  }
  const num = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(num)) {
    return String(value)
  }
  return num.toFixed(2)
}

export function formatExportBranchId(branchId: string | null | undefined): string {
  return branchId?.trim() || "All branches"
}

export type MetadataRow = readonly [field: string, value: string]

export function buildSnapshotMetadataRows(
  snapshot: ReconciliationSnapshotHeader & { note?: string | null },
  exportedAt: string
): MetadataRow[] {
  return [
    ["exportType", "reconciliation_snapshot_evidence"],
    ["snapshotId", snapshot.id],
    ["title", formatSnapshotDisplayTitle(snapshot)],
    ["scope", formatSnapshotScope(snapshot)],
    ["kind", formatSnapshotKindLabel(snapshot.kind)],
    ["branchId", formatExportBranchId(snapshot.branchId)],
    ["periodKey", snapshot.periodKey ?? ""],
    ["fromDate", formatExportIsoDateTime(snapshot.fromDate)],
    ["toDate", formatExportIsoDateTime(snapshot.toDate)],
    ["capturedAt", formatExportIsoDateTime(snapshot.createdAt)],
    ["payloadVersion", String(snapshot.payloadVersion)],
    ["dashboardRowCount", String(snapshot.dashboardRowCount)],
    ["matchedCount", String(snapshot.matchedCount)],
    ["varianceCount", String(snapshot.varianceCount)],
    ["issueCount", String(snapshot.issueCount)],
    ["totalVarianceAmount", formatExportAmount(snapshot.totalVarianceAmount)],
    ["checkedSales", String(snapshot.checkedSales)],
    ["checkedStockDocuments", String(snapshot.checkedStockDocuments)],
    ["note", snapshot.note?.trim() ?? ""],
    ["exportedAt", exportedAt],
  ]
}

export function buildCompareMetadataRows(input: {
  left: ReconciliationSnapshotHeader
  right: ReconciliationSnapshotHeader
  exportedAt: string
}): MetadataRow[] {
  const { left, right, exportedAt } = input
  return [
    ["exportType", "reconciliation_snapshot_compare_evidence"],
    ["leftSnapshotId", left.id],
    ["leftTitle", formatSnapshotDisplayTitle(left)],
    ["leftScope", formatSnapshotScope(left)],
    ["leftCapturedAt", formatExportIsoDateTime(left.createdAt)],
    ["rightSnapshotId", right.id],
    ["rightTitle", formatSnapshotDisplayTitle(right)],
    ["rightScope", formatSnapshotScope(right)],
    ["rightCapturedAt", formatExportIsoDateTime(right.createdAt)],
    ["exportedAt", exportedAt],
  ]
}

export function buildSnapshotExportSlug(
  snapshot: Pick<ReconciliationSnapshotHeader, "id" | "label">
): string {
  const label = snapshot.label?.trim()
  const base = label
    ? label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : snapshot.id.slice(0, 8)
  return base || snapshot.id.slice(0, 8)
}
