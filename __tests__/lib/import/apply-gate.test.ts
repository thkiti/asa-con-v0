import { assertImportApplyGate, ImportApplyGateError } from "@/lib/import/apply-gate"
import { readImportReport } from "@/lib/import/report-store"
import type { ImportReport } from "@/lib/import/types"

jest.mock("@/lib/import/report-store", () => ({
  readImportReport: jest.fn(),
}))

const dryRunReport: ImportReport = {
  profile: "devboard-v1",
  mode: "dry-run",
  sourceDir: "/tmp/source",
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  phases: [],
  totals: {
    rowsRead: 1,
    wouldInsert: 1,
    wouldUpdate: 0,
    skipped: 0,
    inserted: 0,
    updated: 0,
    errors: 0,
    warnings: 0,
    missingProductReferences: 0,
  },
  meta: {
    entity: "branch",
    reportId: "devboard-v1-dry-run-branch-test.json",
    archiveRoot: "/tmp/source",
    sourceChecksums: { "SHP.DBF": "abc123" },
  },
}

describe("assertImportApplyGate", () => {
  beforeEach(() => {
    jest.mocked(readImportReport).mockResolvedValue(dryRunReport)
  })

  it("requires confirm flag", async () => {
    await expect(
      assertImportApplyGate({
        entity: "branch",
        profile: "devboard-v1",
        sourceDir: "/tmp/source",
        dryRunReportId: "devboard-v1-dry-run-branch-test.json",
        confirm: false,
        sourceChecksums: { "SHP.DBF": "abc123" },
      })
    ).rejects.toMatchObject({ code: "CONFIRM_REQUIRED" })
  })

  it("rejects checksum mismatch", async () => {
    await expect(
      assertImportApplyGate({
        entity: "branch",
        profile: "devboard-v1",
        sourceDir: "/tmp/source",
        dryRunReportId: "devboard-v1-dry-run-branch-test.json",
        confirm: true,
        sourceChecksums: { "SHP.DBF": "changed" },
      })
    ).rejects.toBeInstanceOf(ImportApplyGateError)
  })

  it("accepts matching dry-run report", async () => {
    await expect(
      assertImportApplyGate({
        entity: "branch",
        profile: "devboard-v1",
        sourceDir: "/tmp/source",
        dryRunReportId: "devboard-v1-dry-run-branch-test.json",
        confirm: true,
        sourceChecksums: { "SHP.DBF": "abc123" },
      })
    ).resolves.toMatchObject({ mode: "dry-run" })
  })
})
