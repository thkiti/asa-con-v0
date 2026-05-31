import type { CloseEvidenceDetail } from "@/lib/finance/close-evidence-types"
import { rowsToCsvTable, sortByStableKey } from "./csv"
import {
  formatExportAmount,
  formatExportBranchId,
  formatExportIsoDateTime,
  formatExportTimestamp,
  type MetadataRow,
} from "./export-formatters"

export const CLOSE_EVIDENCE_METADATA_CSV_HEADERS = ["field", "value"] as const

export const CLOSE_EVIDENCE_CHECKLIST_CSV_HEADERS = [
  "id",
  "group",
  "severity",
  "title",
] as const

export const CLOSE_EVIDENCE_SUMMARY_CSV_HEADERS = ["metric", "value"] as const

export const CLOSE_EVIDENCE_TRACEABILITY_CSV_HEADERS = [
  "field",
  "value",
] as const

export type CloseEvidenceCsvFile = {
  filename: string
  content: string
}

export function buildCloseEvidenceExportSlug(
  evidence: Pick<CloseEvidenceDetail, "branchId" | "periodKey" | "id">
): string {
  const branch = evidence.branchId.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
  const period = evidence.periodKey.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
  const base = `close-evidence-${branch}-${period}`.replace(/^-|-$/g, "")
  return base || evidence.id.slice(0, 8)
}

export function buildCloseEvidenceMetadataRows(
  evidence: CloseEvidenceDetail,
  exportedAt: string
): MetadataRow[] {
  const { payload } = evidence

  return [
    ["exportType", "accounting_period_close_evidence"],
    ["evidenceId", evidence.id],
    ["periodId", evidence.periodId],
    ["branchId", formatExportBranchId(evidence.branchId)],
    ["periodKey", evidence.periodKey],
    ["closeMode", evidence.closeMode],
    ["closedAt", formatExportIsoDateTime(evidence.closedAt)],
    ["closedByStaffId", evidence.closedByStaffId],
    ["closedByName", evidence.closedByName],
    ["closedByRole", evidence.closedByRole],
    ["readinessStatus", evidence.readinessStatus],
    ["gatePolicyKey", evidence.gatePolicyKey],
    ["reconciliationSnapshotId", evidence.reconciliationSnapshotId ?? ""],
    ["priorSnapshotId", evidence.priorSnapshotId ?? ""],
    ["payloadVersion", String(evidence.payloadVersion)],
    ["evidenceCreatedAt", formatExportIsoDateTime(evidence.createdAt)],
    ["periodStatusBefore", payload.period.statusBefore],
    ["periodStatusAfter", payload.period.statusAfter],
    ["periodOpenedAt", formatExportIsoDateTime(payload.period.openedAt)],
    ["periodClosedAt", formatExportIsoDateTime(payload.period.closedAt)],
    ["gateRejectBlocked", String(payload.gate.rejectBlocked)],
    ["gateRejectWarnings", String(payload.gate.rejectWarnings)],
    ["checklistStatus", payload.checklist.status],
    ["checklistBlockerCount", String(payload.checklist.blockerCount)],
    ["checklistWarningCount", String(payload.checklist.warningCount)],
    ["checklistItemCount", String(payload.checklist.items.length)],
    ["exportedAt", exportedAt],
  ]
}

export function buildCloseEvidenceMetadataCsv(
  evidence: CloseEvidenceDetail,
  exportedAt: string = formatExportTimestamp()
): string {
  return rowsToCsvTable(
    CLOSE_EVIDENCE_METADATA_CSV_HEADERS,
    buildCloseEvidenceMetadataRows(evidence, exportedAt)
  )
}

export function buildCloseEvidenceChecklistCsv(evidence: CloseEvidenceDetail): string {
  const sorted = sortByStableKey(evidence.payload.checklist.items, (item) => item.id)
  const rows = sorted.map((item) => [item.id, item.group, item.severity, item.title])
  return rowsToCsvTable(CLOSE_EVIDENCE_CHECKLIST_CSV_HEADERS, rows)
}

export function buildCloseEvidenceReconciliationSummaryCsv(
  evidence: CloseEvidenceDetail
): string {
  const metrics = evidence.payload.reconciliationSummary
  const issueSummary = evidence.payload.traceabilityRefs.issueSummary
  const rows: unknown[][] = [
    ["dashboardRowCount", metrics.dashboardRowCount],
    ["matchedCount", metrics.matchedCount],
    ["varianceCount", metrics.varianceCount],
    ["totalVarianceAmount", formatExportAmount(metrics.totalVarianceAmount)],
    ["issueCount", metrics.issueCount],
    ["missingGlIssueCount", metrics.missingGlIssueCount],
    ["missingSourceIssueCount", metrics.missingSourceIssueCount],
    ["inventoryDomainPresent", String(metrics.inventoryDomainPresent)],
    ["revenueDomainPresent", String(metrics.revenueDomainPresent)],
    ["snapshotAgeDays", metrics.snapshotAgeDays ?? ""],
    ["compareDriftDetected", String(metrics.compareDriftDetected)],
    ["traceTotalIssueCount", issueSummary.totalCount],
    ["traceMissingGlCount", issueSummary.missingGlCount],
    ["traceMissingSourceCount", issueSummary.missingSourceCount],
    ["traceVarianceStatusCount", issueSummary.varianceStatusCount],
    ["traceErrorSeverityCount", issueSummary.errorSeverityCount],
  ]
  return rowsToCsvTable(CLOSE_EVIDENCE_SUMMARY_CSV_HEADERS, rows)
}

export function buildCloseEvidenceFinancialTotalsCsv(
  evidence: CloseEvidenceDetail
): string {
  const totals = evidence.payload.financialTotals
  const rows: unknown[][] = [
    [
      "operationalInventoryValue",
      formatExportAmount(totals.operationalInventoryValue),
    ],
    ["glInventoryBalance", formatExportAmount(totals.glInventoryBalance)],
    ["operationalRevenue", formatExportAmount(totals.operationalRevenue)],
    ["glRevenueBalance", formatExportAmount(totals.glRevenueBalance)],
  ]
  return rowsToCsvTable(CLOSE_EVIDENCE_SUMMARY_CSV_HEADERS, rows)
}

function snapshotRefRows(
  prefix: string,
  ref: CloseEvidenceDetail["payload"]["traceabilityRefs"]["latestSnapshotRef"]
): MetadataRow[] {
  if (!ref) {
    return [[`${prefix}Id`, ""]]
  }

  return [
    [`${prefix}Id`, ref.id],
    [`${prefix}CreatedAt`, formatExportIsoDateTime(ref.createdAt)],
    [`${prefix}PeriodKey`, ref.periodKey ?? ""],
    [`${prefix}BranchId`, ref.branchId ?? ""],
    [`${prefix}Label`, ref.label ?? ""],
  ]
}

export function buildCloseEvidenceTraceabilityCsv(
  evidence: CloseEvidenceDetail
): string {
  const refs = evidence.payload.traceabilityRefs
  const rows: MetadataRow[] = [
    ["reconciliationSnapshotId", refs.reconciliationSnapshotId ?? ""],
    ["priorSnapshotId", refs.priorSnapshotId ?? ""],
    ["compareDriftDetected", String(refs.compareDriftDetected)],
    ...snapshotRefRows("latestSnapshot", refs.latestSnapshotRef),
    ...snapshotRefRows("priorSnapshot", refs.priorSnapshotRef),
  ]
  return rowsToCsvTable(CLOSE_EVIDENCE_TRACEABILITY_CSV_HEADERS, rows)
}

export function buildCloseEvidenceExport(
  evidence: CloseEvidenceDetail
): CloseEvidenceCsvFile[] {
  const exportedAt = formatExportTimestamp()
  const slug = buildCloseEvidenceExportSlug(evidence)

  return [
    {
      filename: `${slug}-metadata.csv`,
      content: buildCloseEvidenceMetadataCsv(evidence, exportedAt),
    },
    {
      filename: `${slug}-checklist.csv`,
      content: buildCloseEvidenceChecklistCsv(evidence),
    },
    {
      filename: `${slug}-reconciliation-summary.csv`,
      content: buildCloseEvidenceReconciliationSummaryCsv(evidence),
    },
    {
      filename: `${slug}-financial-totals.csv`,
      content: buildCloseEvidenceFinancialTotalsCsv(evidence),
    },
    {
      filename: `${slug}-traceability.csv`,
      content: buildCloseEvidenceTraceabilityCsv(evidence),
    },
  ]
}
