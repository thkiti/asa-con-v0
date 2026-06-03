jest.mock("@/lib/import/run-phase", () => ({
  runImportPhase: jest.fn(),
}))

jest.mock("@/lib/import/services/branch-import", () => ({
  runBranchImport: jest.fn(),
}))

jest.mock("@/lib/import/services/ho-manifest", () => ({
  runHoManifestImport: jest.fn(),
}))

jest.mock("@/lib/import/services/product-import", () => ({
  loadProductImportCodes: jest.fn(),
  runProductImport: jest.fn(),
}))

jest.mock("@/lib/import/services/reference-stock-import", () => ({
  runReferenceStockImport: jest.fn(),
}))

jest.mock("@/lib/import/report", () => ({
  ...jest.requireActual("@/lib/import/report"),
  printImportReport: jest.fn(),
  writeImportReportJson: jest.fn(async () => "tmp/import-reports/full.json"),
}))

jest.mock("@/lib/import/safety", () => ({
  assertImportApplyAllowed: jest.fn(),
}))

import { runBranchImport } from "@/lib/import/services/branch-import"
import { runHoManifestImport } from "@/lib/import/services/ho-manifest"
import { loadProductImportCodes, runProductImport } from "@/lib/import/services/product-import"
import { runReferenceStockImport } from "@/lib/import/services/reference-stock-import"
import { printImportReport } from "@/lib/import/report"
import { runImportPhase } from "@/lib/import/run-phase"
import { parseImportCliArgs, runMasterDataImport } from "@/lib/import/run-import"

describe("parseImportCliArgs", () => {
  it("defaults to full profile dry-run", () => {
    expect(parseImportCliArgs([])).toEqual({
      profile: "devboard-v1",
      apply: false,
      sourceDir: undefined,
      entity: undefined,
    })
  })

  it("parses profile, source dir, apply, and entity", () => {
    expect(
      parseImportCliArgs([
        "--profile=devboard-v1",
        "--source-dir=data/custom",
        "--entity=staff",
        "--apply",
      ])
    ).toEqual({
      profile: "devboard-v1",
      apply: true,
      sourceDir: "data/custom",
      entity: "staff",
    })
  })

  it("accepts all supported entity values", () => {
    for (const entity of ["branch", "product", "reference-stock", "staff"] as const) {
      expect(parseImportCliArgs([`--entity=${entity}`]).entity).toBe(entity)
    }
  })

  it("rejects invalid entity values", () => {
    expect(() => parseImportCliArgs(["--entity=unknown"])).toThrow(
      /Invalid --entity=unknown/
    )
  })

  it("rejects empty entity value", () => {
    expect(() => parseImportCliArgs(["--entity="])).toThrow(/Missing value for --entity/)
  })
})

describe("runMasterDataImport", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(runImportPhase).mockResolvedValue({
      profile: "devboard-v1",
      mode: "dry-run",
      sourceDir: "data/legacy/devboard-v1",
      startedAt: "2026-06-03T10:00:00.000Z",
      completedAt: "2026-06-03T10:00:01.000Z",
      phases: [
        {
          phase: "staff",
          rowsRead: 1,
          wouldInsert: 1,
          wouldUpdate: 0,
          skipped: 0,
          inserted: 0,
          updated: 0,
          errors: [],
          warnings: [],
          missingProductReferences: [],
          sampleRows: [],
        },
      ],
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
        entity: "staff",
        reportId: "devboard-v1-dry-run-staff-2026-06-03.json",
        archiveRoot: "data/legacy/devboard-v1",
        sourceChecksums: {},
      },
    })
    jest.mocked(runBranchImport).mockResolvedValue({
      phase: "branch",
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
    })
    jest.mocked(runHoManifestImport).mockResolvedValue({
      phase: "ho-manifest",
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
    })
    jest.mocked(runProductImport).mockResolvedValue({
      phase: "product",
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
    })
    jest.mocked(loadProductImportCodes).mockResolvedValue(new Set())
    jest.mocked(runReferenceStockImport).mockResolvedValue({
      phase: "reference-stock",
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
    })
  })

  it("routes single-entity CLI runs through runImportPhase", async () => {
    const db = {} as never
    const options = { profile: "devboard-v1", apply: false, entity: "staff" as const }

    await runMasterDataImport(options, db)

    expect(runImportPhase).toHaveBeenCalledWith("staff", options, db)
    expect(runBranchImport).not.toHaveBeenCalled()
    expect(printImportReport).toHaveBeenCalled()
  })

  it("runs full profile import when entity is omitted", async () => {
    const db = {} as never

    await runMasterDataImport({ profile: "devboard-v1", apply: false }, db)

    expect(runImportPhase).not.toHaveBeenCalled()
    expect(runBranchImport).toHaveBeenCalled()
    expect(runHoManifestImport).toHaveBeenCalled()
    expect(runProductImport).toHaveBeenCalled()
    expect(runReferenceStockImport).toHaveBeenCalled()
  })
})
