import { readImportReport } from "./report-store"
import type { ImportEntity, ImportReport } from "./types"

export class ImportApplyGateError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus: number) {
    super(message)
    this.name = "ImportApplyGateError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

const MAX_DRY_RUN_AGE_MS = 24 * 60 * 60 * 1000

export type ImportApplyGateInput = {
  entity: ImportEntity
  profile: string
  sourceDir: string
  dryRunReportId: string
  confirm: boolean
  sourceChecksums: Record<string, string>
}

export async function assertImportApplyGate(input: ImportApplyGateInput): Promise<ImportReport> {
  if (!input.confirm) {
    throw new ImportApplyGateError(
      "Apply requires explicit confirmation",
      "CONFIRM_REQUIRED",
      400
    )
  }

  const dryRunReport = await readImportReport(input.dryRunReportId)
  if (!dryRunReport) {
    throw new ImportApplyGateError(
      "Dry-run report not found",
      "DRY_RUN_REPORT_NOT_FOUND",
      409
    )
  }

  if (dryRunReport.mode !== "dry-run") {
    throw new ImportApplyGateError(
      "Referenced report is not a dry-run report",
      "INVALID_DRY_RUN_REPORT",
      409
    )
  }

  if (dryRunReport.meta?.entity !== input.entity) {
    throw new ImportApplyGateError(
      "Dry-run report entity mismatch",
      "ENTITY_MISMATCH",
      409
    )
  }

  if (dryRunReport.profile !== input.profile) {
    throw new ImportApplyGateError(
      "Dry-run report profile mismatch",
      "PROFILE_MISMATCH",
      409
    )
  }

  if (dryRunReport.sourceDir !== input.sourceDir) {
    throw new ImportApplyGateError(
      "Dry-run report sourceDir mismatch",
      "SOURCE_DIR_MISMATCH",
      409
    )
  }

  const startedAt = Date.parse(dryRunReport.startedAt)
  if (Number.isFinite(startedAt) && Date.now() - startedAt > MAX_DRY_RUN_AGE_MS) {
    throw new ImportApplyGateError(
      "Dry-run report expired — run dry-run again",
      "DRY_RUN_EXPIRED",
      409
    )
  }

  if (dryRunReport.totals.errors > 0) {
    throw new ImportApplyGateError(
      "Dry-run report contains errors — resolve before apply",
      "DRY_RUN_HAS_ERRORS",
      409
    )
  }

  const expected = dryRunReport.meta?.sourceChecksums ?? {}
  for (const [filename, expectedSha] of Object.entries(expected)) {
    const currentSha = input.sourceChecksums[filename]
    if (!currentSha || currentSha !== expectedSha) {
      throw new ImportApplyGateError(
        `Source file changed since dry-run: ${filename}`,
        "SOURCE_CHANGED",
        409
      )
    }
  }

  return dryRunReport
}
