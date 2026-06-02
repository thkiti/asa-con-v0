import { canEnableApply } from "@/lib/system-ui/import-state"
import type { ImportReportView } from "@/lib/system-ui/import-types"

function sampleReport(overrides: Partial<ImportReportView> = {}): ImportReportView {
  return {
    profile: "devboard-v1",
    mode: "dry-run",
    sourceDir: "data/legacy/devboard-v1",
    startedAt: "2026-06-03T10:00:00.000Z",
    completedAt: "2026-06-03T10:00:01.000Z",
    phases: [],
    totals: {
      rowsRead: 10,
      wouldInsert: 5,
      wouldUpdate: 2,
      skipped: 3,
      inserted: 0,
      updated: 0,
      errors: 0,
      warnings: 0,
      missingProductReferences: 0,
    },
    meta: {
      entity: "branch",
      reportId: "devboard-v1-dry-run-branch-2026-06-03T10-00-00-000Z.json",
      archiveRoot: "data/legacy/devboard-v1",
      sourceChecksums: {},
    },
    ...overrides,
  }
}

describe("canEnableApply", () => {
  it("returns false when no dry-run report exists", () => {
    expect(canEnableApply(null)).toBe(false)
  })

  it("returns false when dry-run has errors", () => {
    expect(
      canEnableApply(
        sampleReport({
          totals: {
            ...sampleReport().totals,
            errors: 1,
          },
        })
      )
    ).toBe(false)
  })

  it("returns false for apply mode reports", () => {
    expect(canEnableApply(sampleReport({ mode: "apply" }))).toBe(false)
  })

  it("returns true for successful dry-run with report id", () => {
    expect(canEnableApply(sampleReport())).toBe(true)
  })
})
