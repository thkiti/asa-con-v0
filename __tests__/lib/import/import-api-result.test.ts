import {
  flattenPhaseErrors,
  toImportApiResult,
} from "@/lib/import/import-api-result"
import type { ImportReport } from "@/lib/import/types"

function sampleReport(overrides: Partial<ImportReport> = {}): ImportReport {
  return {
    profile: "devboard-v1",
    mode: "dry-run",
    sourceDir: "data/legacy/devboard-v1",
    startedAt: "2026-06-03T10:00:00.000Z",
    completedAt: "2026-06-03T10:00:01.000Z",
    phases: [
      {
        phase: "product",
        rowsRead: 2,
        wouldInsert: 1,
        wouldUpdate: 0,
        skipped: 0,
        inserted: 0,
        updated: 0,
        errors: ["bad row"],
        warnings: ["warn"],
        missingProductReferences: [],
        sampleRows: [],
      },
    ],
    totals: {
      rowsRead: 2,
      wouldInsert: 1,
      wouldUpdate: 0,
      skipped: 0,
      inserted: 0,
      updated: 0,
      errors: 1,
      warnings: 1,
      missingProductReferences: 0,
    },
    meta: {
      entity: "product",
      reportId: "report-1",
      archiveRoot: "data/legacy/devboard-v1",
      sourceChecksums: {},
    },
    ...overrides,
  }
}

describe("toImportApiResult", () => {
  it("marks failed when totals.errors > 0", () => {
    const result = toImportApiResult("product", sampleReport())
    expect(result.success).toBe(false)
    expect(result.failed).toBe(true)
    expect(result.errors).toEqual(["bad row"])
    expect(result.warnings).toEqual(["warn"])
    expect(result.skipped).toBe(0)
  })

  it("marks success with apply counts", () => {
    const report = sampleReport({
      mode: "apply",
      phases: [
        {
          phase: "product",
          rowsRead: 2,
          wouldInsert: 0,
          wouldUpdate: 0,
          skipped: 0,
          inserted: 2,
          updated: 1,
          errors: [],
          warnings: [],
          missingProductReferences: [],
          sampleRows: [],
        },
      ],
      totals: {
        rowsRead: 2,
        wouldInsert: 0,
        wouldUpdate: 0,
        skipped: 0,
        inserted: 2,
        updated: 1,
        errors: 0,
        warnings: 0,
        missingProductReferences: 0,
      },
    })

    const result = toImportApiResult("product", report)
    expect(result.success).toBe(true)
    expect(result.failed).toBe(false)
    expect(result.inserted).toBe(2)
    expect(result.updated).toBe(1)
  })

  it("flattenPhaseErrors collects all phase errors", () => {
    const report = sampleReport({
      phases: [
        {
          phase: "a",
          rowsRead: 0,
          wouldInsert: 0,
          wouldUpdate: 0,
          skipped: 0,
          inserted: 0,
          updated: 0,
          errors: ["e1"],
          warnings: [],
          missingProductReferences: [],
          sampleRows: [],
        },
        {
          phase: "b",
          rowsRead: 0,
          wouldInsert: 0,
          wouldUpdate: 0,
          skipped: 0,
          inserted: 0,
          updated: 0,
          errors: ["e2"],
          warnings: [],
          missingProductReferences: [],
          sampleRows: [],
        },
      ],
      totals: {
        rowsRead: 0,
        wouldInsert: 0,
        wouldUpdate: 0,
        skipped: 0,
        inserted: 0,
        updated: 0,
        errors: 2,
        warnings: 0,
        missingProductReferences: 0,
      },
    })

    expect(flattenPhaseErrors(report)).toEqual(["e1", "e2"])
  })
})
