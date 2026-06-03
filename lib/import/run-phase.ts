import { prisma } from "@/lib/shared/prisma"

import { collectSourceChecksums } from "./archive/read-manifest"
import { resolveImportProfile } from "./profiles/devboard-v1"
import { finalizeImportReport } from "./report"
import { writePhaseImportReport, buildImportReportId } from "./report-store"
import { assertImportApplyAllowed } from "./safety"
import { runBranchImport } from "./services/branch-import"
import { runHoManifestImport } from "./services/ho-manifest"
import { loadProductImportCodes, runProductImport } from "./services/product-import"
import { runReferenceStockImport } from "./services/reference-stock-import"
import { runStaffImport } from "./services/staff-import"
import { createImportDb } from "./import-db"
import type { ImportDb, ImportEntity, ImportReport, ImportRunOptions } from "./types"

async function executeImportPhases(
  entity: ImportEntity,
  options: ImportRunOptions,
  db: ImportDb
): Promise<ImportReport> {
  const profile = resolveImportProfile(options)
  const mode = options.apply ? "apply" : "dry-run"
  const sourceChecksums = await collectSourceChecksums(profile.sourceDir)

  const report: ImportReport = {
    profile: profile.id,
    mode,
    sourceDir: profile.sourceDir,
    startedAt: new Date().toISOString(),
    completedAt: "",
    phases: [],
    totals: {
      rowsRead: 0,
      wouldInsert: 0,
      wouldUpdate: 0,
      skipped: 0,
      inserted: 0,
      updated: 0,
      errors: 0,
      warnings: 0,
      missingProductReferences: 0,
    },
  }

  switch (entity) {
    case "branch":
      report.phases.push(await runBranchImport({ db, profile, apply: options.apply }))
      report.phases.push(await runHoManifestImport({ db, profile, apply: options.apply }))
      break
    case "product":
      report.phases.push(await runProductImport({ db, profile, apply: options.apply }))
      break
    case "reference-stock": {
      const pendingProductCodes = await loadProductImportCodes(profile)
      report.phases.push(
        await runReferenceStockImport({
          db,
          profile,
          apply: options.apply,
          pendingProductCodes,
        })
      )
      break
    }
    case "staff":
      report.phases.push(await runStaffImport({ db, profile, apply: options.apply }))
      break
    default:
      throw new Error(`Unknown import entity: ${entity satisfies never}`)
  }

  const finalized = finalizeImportReport(report)
  const reportId = buildImportReportId(finalized, entity)
  finalized.meta = {
    entity,
    reportId,
    archiveRoot: profile.sourceDir,
    sourceChecksums,
  }
  await writePhaseImportReport(finalized, entity)
  return finalized
}

export async function runImportPhase(
  entity: ImportEntity,
  options: ImportRunOptions,
  db: ImportDb = createImportDb()
): Promise<ImportReport> {
  if (options.apply) {
    assertImportApplyAllowed(true)
    return prisma.$transaction((tx) =>
      executeImportPhases(entity, options, createImportDb(tx as unknown as ImportDb))
    )
  }

  return executeImportPhases(entity, options, db)
}
