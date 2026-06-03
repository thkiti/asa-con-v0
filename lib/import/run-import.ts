import { createImportDb } from "./import-db"
import { resolveImportProfile } from "./profiles/devboard-v1"
import { runImportPhase } from "./run-phase"
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
import type { ImportDb, ImportEntity, ImportReport, ImportRunOptions } from "./types"

const IMPORT_ENTITIES: ImportEntity[] = ["branch", "product", "reference-stock", "staff"]

export { createImportDb } from "./import-db"

export async function runMasterDataImport(
  options: ImportRunOptions,
  db: ImportDb = createImportDb()
): Promise<ImportReport> {
  assertImportApplyAllowed(options.apply)

  if (options.entity) {
    const report = await runImportPhase(options.entity, options, db)
    printImportReport(report)
    if (report.meta?.reportId) {
      console.log(`Report written: tmp/import-reports/${report.meta.reportId}`)
    }
    return report
  }

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
  const entityArg = argv.find((arg) => arg.startsWith("--entity="))
  const entityValue = entityArg?.split("=")[1]?.trim()

  if (entityArg && !entityValue) {
    throw new Error("Missing value for --entity")
  }

  if (entityValue && !IMPORT_ENTITIES.includes(entityValue as ImportEntity)) {
    throw new Error(
      `Invalid --entity=${entityValue}. Expected one of: ${IMPORT_ENTITIES.join(", ")}`
    )
  }

  return {
    profile: profileArg?.split("=")[1]?.trim() || "devboard-v1",
    apply,
    sourceDir: sourceArg?.split("=")[1]?.trim(),
    entity: entityValue as ImportEntity | undefined,
  }
}
