import type { ImportApiResultView, ImportEntityKey, ImportReportView } from "./import-types"

export function canEnableApply(report: ImportReportView | null): boolean {
  if (!report) return false
  if (report.mode !== "dry-run") return false
  if (report.totals.errors > 0) return false
  if (!report.meta?.reportId) return false
  return true
}

export function canEnableApplyFromResult(result: ImportApiResultView | null): boolean {
  if (!result?.success) return false
  return canEnableApply(result.report)
}

export function findLatestDryRunReportId(
  reports: Array<{ entity: ImportEntityKey | null; mode: string; reportId: string }>,
  entity: ImportEntityKey
): string | null {
  const hit = reports.find((item) => item.entity === entity && item.mode === "dry-run")
  return hit?.reportId ?? null
}
