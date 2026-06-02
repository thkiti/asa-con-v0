import type { ImportArchiveFileView, ImportReportView } from "./import-types"

export function formatReportTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("th-TH")
}

export function formatFileSize(sizeBytes: number | null): string {
  if (sizeBytes == null) return "—"
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatSha256Prefix(sha256: string | null): string {
  if (!sha256) return "—"
  return `${sha256.slice(0, 12)}…`
}

export function summarizeArchiveFilesForRoles(
  files: ImportArchiveFileView[],
  roles: string[]
): { present: number; missingRequired: number; total: number } {
  const matched = files.filter((file) => roles.includes(file.importRole))
  const present = matched.filter((file) => file.exists).length
  const missingRequired = matched.filter((file) => file.required && !file.exists).length
  return { present, missingRequired, total: matched.length }
}

export function reportModeLabel(mode: ImportReportView["mode"]): string {
  return mode === "dry-run" ? "Dry Run" : "Apply"
}

export function insertCount(report: ImportReportView): number {
  return report.mode === "apply" ? report.totals.inserted : report.totals.wouldInsert
}

export function updateCount(report: ImportReportView): number {
  return report.mode === "apply" ? report.totals.updated : report.totals.wouldUpdate
}

export function collectReportErrors(report: ImportReportView): string[] {
  return report.phases.flatMap((phase) => phase.errors)
}

export function collectReportWarnings(report: ImportReportView): string[] {
  return report.phases.flatMap((phase) => phase.warnings)
}

export function collectMissingProductReferences(report: ImportReportView): string[] {
  return report.phases.flatMap((phase) => phase.missingProductReferences)
}
