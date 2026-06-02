import fs from "fs/promises"
import path from "path"

import type { ImportPhaseReport, ImportReport, ImportReportTotals } from "./types"

const SAMPLE_ROW_LIMIT = 5

export function createEmptyPhaseReport(phase: ImportPhaseReport["phase"]): ImportPhaseReport {
  return {
    phase,
    rowsRead: 0,
    wouldInsert: 0,
    wouldUpdate: 0,
    skipped: 0,
    inserted: 0,
    updated: 0,
    errors: [],
    warnings: [],
    missingProductReferences: [],
    sampleRows: [],
  }
}

export function summarizeImportReport(report: ImportReport): ImportReportTotals {
  return report.phases.reduce<ImportReportTotals>(
    (totals, phase) => ({
      rowsRead: totals.rowsRead + phase.rowsRead,
      wouldInsert: totals.wouldInsert + phase.wouldInsert,
      wouldUpdate: totals.wouldUpdate + phase.wouldUpdate,
      skipped: totals.skipped + phase.skipped,
      inserted: totals.inserted + phase.inserted,
      updated: totals.updated + phase.updated,
      errors: totals.errors + phase.errors.length,
      warnings: totals.warnings + phase.warnings.length,
      missingProductReferences:
        totals.missingProductReferences + phase.missingProductReferences.length,
    }),
    {
      rowsRead: 0,
      wouldInsert: 0,
      wouldUpdate: 0,
      skipped: 0,
      inserted: 0,
      updated: 0,
      errors: 0,
      warnings: 0,
      missingProductReferences: 0,
    }
  )
}

export function finalizeImportReport(report: ImportReport): ImportReport {
  return {
    ...report,
    completedAt: new Date().toISOString(),
    totals: summarizeImportReport(report),
  }
}

export function printImportReport(report: ImportReport): void {
  console.log("")
  console.log(`Import profile: ${report.profile}`)
  console.log(`Mode: ${report.mode}`)
  console.log(`Source: ${report.sourceDir}`)
  console.log("")

  for (const phase of report.phases) {
    console.log(`Phase: ${phase.phase}`)
    console.log(`  rows read: ${phase.rowsRead}`)
    console.log(`  would insert: ${phase.wouldInsert}`)
    console.log(`  would update: ${phase.wouldUpdate}`)
    console.log(`  skipped: ${phase.skipped}`)
    if (report.mode === "apply") {
      console.log(`  inserted: ${phase.inserted}`)
      console.log(`  updated: ${phase.updated}`)
    }
    console.log(`  errors: ${phase.errors.length}`)
    console.log(`  warnings: ${phase.warnings.length}`)
    console.log(`  missing product references: ${phase.missingProductReferences.length}`)
    if (phase.sampleRows.length > 0) {
      console.log("  sample rows:")
      for (const row of phase.sampleRows) {
        console.log(`    ${JSON.stringify(row)}`)
      }
    }
    if (phase.errors.length > 0) {
      console.log("  error samples:")
      for (const error of phase.errors.slice(0, SAMPLE_ROW_LIMIT)) {
        console.log(`    ${error}`)
      }
    }
    if (phase.warnings.length > 0) {
      console.log("  warning samples:")
      for (const warning of phase.warnings.slice(0, SAMPLE_ROW_LIMIT)) {
        console.log(`    ${warning}`)
      }
    }
    if (phase.missingProductReferences.length > 0) {
      console.log("  missing product reference samples:")
      for (const missing of phase.missingProductReferences.slice(0, SAMPLE_ROW_LIMIT)) {
        console.log(`    ${missing}`)
      }
    }
    console.log("")
  }

  console.log("Totals")
  console.log(`  rows read: ${report.totals.rowsRead}`)
  console.log(`  would insert: ${report.totals.wouldInsert}`)
  console.log(`  would update: ${report.totals.wouldUpdate}`)
  console.log(`  skipped: ${report.totals.skipped}`)
  if (report.mode === "apply") {
    console.log(`  inserted: ${report.totals.inserted}`)
    console.log(`  updated: ${report.totals.updated}`)
  }
  console.log(`  errors: ${report.totals.errors}`)
  console.log(`  warnings: ${report.totals.warnings}`)
  console.log(`  missing product references: ${report.totals.missingProductReferences}`)
}

export async function writeImportReportJson(report: ImportReport): Promise<string> {
  const dir = path.join(process.cwd(), "tmp", "import-reports")
  await fs.mkdir(dir, { recursive: true })

  const stamp = report.startedAt.replace(/[:.]/g, "-")
  const fileName = `${report.profile}-${report.mode}-${stamp}.json`
  const filePath = path.join(dir, fileName)
  await fs.writeFile(filePath, JSON.stringify(report, null, 2), "utf8")
  return filePath
}

export function takeSampleRows<T>(rows: T[], limit = SAMPLE_ROW_LIMIT): T[] {
  return rows.slice(0, limit)
}
