import { POST as POSTApply } from "@/app/api/system/import/apply/route"
import { POST as POSTDryRun } from "@/app/api/system/import/dry-run/route"
import { getSession, requireSystemImportActor } from "@/lib/auth"
import { assertImportApplyGate } from "@/lib/import/apply-gate"
import { collectSourceChecksums } from "@/lib/import/archive/read-manifest"
import { runImportPhase } from "@/lib/import/run-phase"
import type { ImportReport } from "@/lib/import/types"

jest.mock("@/lib/auth", () => ({
  getSession: jest.fn(),
  requireSystemImportActor: jest.fn(),
}))

jest.mock("@/lib/import/apply-gate", () => ({
  assertImportApplyGate: jest.fn(),
}))

jest.mock("@/lib/import/archive/read-manifest", () => ({
  collectSourceChecksums: jest.fn(),
}))

jest.mock("@/lib/import/run-phase", () => ({
  runImportPhase: jest.fn(),
}))

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedRequireActor = requireSystemImportActor as jest.MockedFunction<
  typeof requireSystemImportActor
>
const mockedRunImportPhase = runImportPhase as jest.MockedFunction<typeof runImportPhase>
const mockedApplyGate = assertImportApplyGate as jest.MockedFunction<typeof assertImportApplyGate>
const mockedChecksums = collectSourceChecksums as jest.MockedFunction<
  typeof collectSourceChecksums
>

function buildReport(overrides: Partial<ImportReport> = {}): ImportReport {
  return {
    profile: "devboard-v1",
    mode: "dry-run",
    sourceDir: "data/legacy/devboard-v1",
    startedAt: "2026-06-03T10:00:00.000Z",
    completedAt: "2026-06-03T10:00:01.000Z",
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
    meta: {
      entity: "product",
      reportId: "dry-run-product.json",
      archiveRoot: "data/legacy/devboard-v1",
      sourceChecksums: {},
    },
    ...overrides,
  }
}

describe("POST /api/system/import/dry-run", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue({
      sessionId: "s1",
      role: "HO_ADMIN",
      staffId: "001",
      name: "Admin",
      branchId: "branch-1",
    })
    mockedRequireActor.mockReturnValue({ staffId: "001", role: "HO_ADMIN" })
  })

  it("returns envelope with failed true when report has errors", async () => {
    mockedRunImportPhase.mockResolvedValue(
      buildReport({
        phases: [
          {
            phase: "product",
            rowsRead: 1,
            wouldInsert: 0,
            wouldUpdate: 0,
            skipped: 0,
            inserted: 0,
            updated: 0,
            errors: ["parse failed"],
            warnings: [],
            missingProductReferences: [],
            sampleRows: [],
          },
        ],
        totals: {
          rowsRead: 1,
          wouldInsert: 0,
          wouldUpdate: 0,
          skipped: 0,
          inserted: 0,
          updated: 0,
          errors: 1,
          warnings: 0,
          missingProductReferences: 0,
        },
      })
    )

    const res = await POSTDryRun(
      new Request("http://localhost/api/system/import/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: "product" }),
      })
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.failed).toBe(true)
    expect(body.errors).toEqual(["parse failed"])
    expect(body.report.totals.errors).toBe(1)
  })
})

describe("POST /api/system/import/apply", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue({
      sessionId: "s1",
      role: "HO_ADMIN",
      staffId: "001",
      name: "Admin",
      branchId: "branch-1",
    })
    mockedRequireActor.mockReturnValue({ staffId: "001", role: "HO_ADMIN" })
    mockedApplyGate.mockResolvedValue(buildReport())
    mockedChecksums.mockResolvedValue({})
  })

  it("returns 409 envelope when apply report has errors", async () => {
    mockedRunImportPhase.mockResolvedValue(
      buildReport({
        mode: "apply",
        phases: [
          {
            phase: "staff",
            rowsRead: 1,
            wouldInsert: 0,
            wouldUpdate: 0,
            skipped: 0,
            inserted: 0,
            updated: 0,
            errors: ["missing branch"],
            warnings: [],
            missingProductReferences: [],
            sampleRows: [],
          },
        ],
        totals: {
          rowsRead: 1,
          wouldInsert: 0,
          wouldUpdate: 0,
          skipped: 0,
          inserted: 0,
          updated: 0,
          errors: 1,
          warnings: 0,
          missingProductReferences: 0,
        },
      })
    )

    const res = await POSTApply(
      new Request("http://localhost/api/system/import/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "staff",
          dryRunReportId: "dry-run-staff.json",
          confirm: true,
        }),
      })
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.failed).toBe(true)
    expect(body.inserted).toBe(0)
    expect(body.updated).toBe(0)
    expect(body.errors).toContain("missing branch")
  })

  it("returns 200 envelope when apply succeeds", async () => {
    mockedRunImportPhase.mockResolvedValue(
      buildReport({
        mode: "apply",
        totals: {
          rowsRead: 2,
          wouldInsert: 0,
          wouldUpdate: 0,
          skipped: 0,
          inserted: 2,
          updated: 0,
          errors: 0,
          warnings: 0,
          missingProductReferences: 0,
        },
      })
    )

    const res = await POSTApply(
      new Request("http://localhost/api/system/import/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "product",
          dryRunReportId: "dry-run-product.json",
          confirm: true,
        }),
      })
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.failed).toBe(false)
    expect(body.inserted).toBe(2)
  })
})
