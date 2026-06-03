import type { ImportEntity, ImportReport } from "./types"

export type ImportApiResult = {
  success: boolean
  failed: boolean
  mode: ImportReport["mode"]
  entity: ImportEntity
  inserted: number
  updated: number
  skipped: number
  errors: string[]
  warnings: string[]
  report: ImportReport
}

export function flattenPhaseErrors(report: ImportReport): string[] {
  return report.phases.flatMap((phase) => phase.errors)
}

export function flattenPhaseWarnings(report: ImportReport): string[] {
  return report.phases.flatMap((phase) => phase.warnings)
}

export function toImportApiResult(entity: ImportEntity, report: ImportReport): ImportApiResult {
  const success = report.totals.errors === 0
  return {
    success,
    failed: !success,
    mode: report.mode,
    entity,
    inserted: report.totals.inserted,
    updated: report.totals.updated,
    skipped: report.totals.skipped,
    errors: flattenPhaseErrors(report),
    warnings: flattenPhaseWarnings(report),
    report,
  }
}
