import { prisma } from "@/lib/shared/prisma"

import { resolveImportProfile } from "./profiles/devboard-v1"
import {
  finalizeImportReport,
  printImportReport,
  writeImportReportJson,
} from "./report"
import { assertImportApplyAllowed } from "./safety"
import { runBranchImport } from "./services/branch-import"
import { runHoManifestImport } from "./services/ho-manifest"
import { loadProductImportCodes, runProductImport } from "./services/product-import"
import { runReferenceStockImport } from "./services/reference-stock-import"
import type { ImportDb, ImportReport, ImportRunOptions } from "./types"

export function createImportDb(db: ImportDb = prisma as unknown as ImportDb): ImportDb {
  return db
}

export async function runMasterDataImport(
  options: ImportRunOptions,
  db: ImportDb = createImportDb()
): Promise<ImportReport> {
  assertImportApplyAllowed(options.apply)

  const profile = resolveImportProfile(options)
  const mode = options.apply ? "apply" : "dry-run"

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

  report.phases.push(await runBranchImport({ db, profile, apply: options.apply }))
  report.phases.push(await runHoManifestImport({ db, profile, apply: options.apply }))
  report.phases.push(await runProductImport({ db, profile, apply: options.apply }))
  const pendingProductCodes = await loadProductImportCodes(profile)
  report.phases.push(
    await runReferenceStockImport({
      db,
      profile,
      apply: options.apply,
      pendingProductCodes,
    })
  )

  const finalized = finalizeImportReport(report)
  printImportReport(finalized)
  const reportPath = await writeImportReportJson(finalized)
  console.log(`Report written: ${reportPath}`)

  return finalized
}

export function parseImportCliArgs(argv: string[]): ImportRunOptions {
  const apply = argv.includes("--apply")
  const profileArg = argv.find((arg) => arg.startsWith("--profile="))
  const sourceArg = argv.find((arg) => arg.startsWith("--source-dir="))

  return {
    profile: profileArg?.split("=")[1]?.trim() || "devboard-v1",
    apply,
    sourceDir: sourceArg?.split("=")[1]?.trim(),
  }
}
