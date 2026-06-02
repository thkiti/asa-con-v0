import { renderToStaticMarkup } from "react-dom/server"
import { StaffImportNotices } from "@/components/system/import/StaffImportNotices"
import { ApplyConfirmDialog } from "@/components/system/import/ApplyConfirmDialog"
import { EntityImportCard } from "@/components/system/import/EntityImportCard"
import { ImportDashboard } from "@/components/system/import/ImportDashboard"
import { ImportEntityPage } from "@/components/system/import/ImportEntityPage"
import { ImportReportSummary } from "@/components/system/import/ImportReportSummary"
import {
  SYSTEM_IMPORT_DESCRIPTION,
  IMPORT_ENTITY_CONFIGS,
  getImportEntityConfig,
  STAFF_IMPORT_LOGIN_NOTE,
  STAFF_IMPORT_NO_STAFF_WARNING,
} from "@/lib/system-ui/import-entity-config"
import type { ImportReportView } from "@/lib/system-ui/import-types"

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

const mockFetchImportStatus = jest.fn()
const mockPostImportDryRun = jest.fn()
const mockPostImportApply = jest.fn()
const mockFetchImportReports = jest.fn()
const mockFetchImportReport = jest.fn()
const mockPostLogout = jest.fn()

jest.mock("@/lib/system-ui/import-fetchers", () => ({
  fetchImportStatus: (...args: unknown[]) => mockFetchImportStatus(...args),
  postImportDryRun: (...args: unknown[]) => mockPostImportDryRun(...args),
  postImportApply: (...args: unknown[]) => mockPostImportApply(...args),
  fetchImportReports: (...args: unknown[]) => mockFetchImportReports(...args),
  fetchImportReport: (...args: unknown[]) => mockFetchImportReport(...args),
  postLogout: (...args: unknown[]) => mockPostLogout(...args),
}))

const archiveStatus = {
  archiveRoot: "data/legacy/devboard-v1",
  manifestPresent: true,
  files: [
    {
      filename: "dbf/SHP.DBF",
      importRole: "branch",
      required: true,
      exists: true,
      sha256: "abc123",
      sizeBytes: 1024,
    },
    {
      filename: "dbf/POSINY.DBF",
      importRole: "product",
      required: true,
      exists: true,
      sha256: "def456",
      sizeBytes: 2048,
    },
    {
      filename: "csv/kCode.csv",
      importRole: "reference-stock",
      required: true,
      exists: false,
      sha256: null,
      sizeBytes: null,
    },
    {
      filename: "dbf/EME.DBF",
      importRole: "staff",
      required: true,
      exists: true,
      sha256: "ghi789",
      sizeBytes: 512,
    },
  ],
  warnings: [],
}

const statusPayload = {
  archive: archiveStatus,
  latestReports: [
    {
      reportId: "devboard-v1-dry-run-branch-2026-06-03.json",
      entity: "branch" as const,
      mode: "dry-run" as const,
      profile: "devboard-v1",
      startedAt: "2026-06-03T10:00:00.000Z",
      mtimeMs: 1,
    },
  ],
  staffBootstrap: {
    importedStaffCount: 0,
    hasBootstrapAdmin: false,
  },
  productionGuardActive: false,
  importAllowProduction: false,
}

function sampleReport(overrides: Partial<ImportReportView> = {}): ImportReportView {
  return {
    profile: "devboard-v1",
    mode: "dry-run",
    sourceDir: "data/legacy/devboard-v1",
    startedAt: "2026-06-03T10:00:00.000Z",
    completedAt: "2026-06-03T10:00:01.000Z",
    phases: [
      {
        phase: "branch",
        rowsRead: 12,
        wouldInsert: 4,
        wouldUpdate: 1,
        skipped: 0,
        inserted: 0,
        updated: 0,
        errors: [],
        warnings: ["sample warning"],
        missingProductReferences: [],
        sampleRows: [],
      },
    ],
    totals: {
      rowsRead: 12,
      wouldInsert: 4,
      wouldUpdate: 1,
      skipped: 0,
      inserted: 0,
      updated: 0,
      errors: 0,
      warnings: 1,
      missingProductReferences: 0,
    },
    meta: {
      entity: "branch",
      reportId: "devboard-v1-dry-run-branch-2026-06-03.json",
      archiveRoot: "data/legacy/devboard-v1",
      sourceChecksums: {},
    },
    ...overrides,
  }
}

describe("System Import UI", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchImportStatus.mockResolvedValue(statusPayload)
    mockFetchImportReports.mockResolvedValue({ reports: [] })
    mockFetchImportReport.mockResolvedValue(sampleReport())
    mockPostImportDryRun.mockResolvedValue(sampleReport())
    mockPostImportApply.mockResolvedValue(sampleReport({ mode: "apply" }))
    mockPostLogout.mockResolvedValue({ redirectTo: "/login" })
  })

  it("dashboard renders Thai system import description", () => {
    const html = renderToStaticMarkup(<ImportDashboard />)
    expect(html).toContain(SYSTEM_IMPORT_DESCRIPTION)
  })

  it("dashboard renders entity card configs and links", () => {
    expect(IMPORT_ENTITY_CONFIGS.map((item) => item.title)).toEqual([
      "Branch Import",
      "Product Import",
      "ReferenceStock Import",
      "Staff Import",
    ])
    const html = renderToStaticMarkup(
      <EntityImportCard
        config={IMPORT_ENTITY_CONFIGS[0]}
        archive={archiveStatus}
        latestReport={null}
      />
    )
    expect(html).toContain("/system/import/branch")
  })

  it("entity card shows archive and report summary fields", () => {
    const html = renderToStaticMarkup(
      <EntityImportCard
        config={getImportEntityConfig("branch")}
        archive={archiveStatus}
        latestReport={statusPayload.latestReports[0]}
      />
    )
    expect(html).toContain("Archive")
    expect(html).toContain("Report ล่าสุด")
    expect(html).toContain("Dry Run")
  })

  it("entity page disables Apply before successful dry-run", () => {
    const html = renderToStaticMarkup(<ImportEntityPage entity="branch" />)
    expect(html).toContain("ต้อง Dry Run สำเร็จก่อน (ไม่มี errors) จึงจะ Apply ได้")
    expect(html).toMatch(/disabled=""[\s\S]*>Apply<\/button>/)
  })

  it("apply confirm dialog renders Thai confirmation copy", () => {
    const html = renderToStaticMarkup(
      <ApplyConfirmDialog open onCancel={() => undefined} onConfirm={() => undefined} />
    )
    expect(html).toContain("ยืนยัน Apply")
    expect(html).toContain("upsert")
    expect(html).toContain("ไม่มีการ reset หรือลบข้อมูลทั้งหมด")
  })

  it("report summary renders counts warnings and errors", () => {
    const html = renderToStaticMarkup(
      <ImportReportSummary
        report={sampleReport({
          phases: [
            {
              phase: "reference-stock",
              rowsRead: 3,
              wouldInsert: 1,
              wouldUpdate: 0,
              skipped: 0,
              inserted: 0,
              updated: 0,
              errors: ["missing branch"],
              warnings: ["optional file missing"],
              missingProductReferences: ["1234567"],
              sampleRows: [],
            },
          ],
          totals: {
            rowsRead: 3,
            wouldInsert: 1,
            wouldUpdate: 0,
            skipped: 0,
            inserted: 0,
            updated: 0,
            errors: 1,
            warnings: 1,
            missingProductReferences: 1,
          },
        })}
        showMissingReferences
      />
    )
    expect(html).toContain("Rows read")
    expect(html).toContain("Insert")
    expect(html).toContain("Update")
    expect(html).toContain("Skipped")
    expect(html).toContain("missing branch")
    expect(html).toContain("optional file missing")
    expect(html).toContain("1234567")
    expect(html).toContain("รหัส Product ที่ยังไม่มีในระบบ")
  })

  it("staff page shows bootstrap mapping copy in Thai", () => {
    const html = renderToStaticMarkup(<ImportEntityPage entity="staff" />)
    expect(html).toContain("staffId 001 → สำนักงานใหญ่ HO999")
    expect(html).toContain("staffId 001 → ผู้ดูแลระบบ")
    expect(html).toContain("พนักงานอื่น → สาขา SH001")
    expect(html).toContain("พนักงานอื่น → พนักงานสาขา")
    expect(html).not.toContain("HO_ADMIN")
    expect(html).not.toContain("SH_STAFF")
  })

  it("staff page shows login note and no-staff warning when empty", () => {
    const emptyHtml = renderToStaticMarkup(
      <StaffImportNotices staffBootstrap={{ importedStaffCount: 0, hasBootstrapAdmin: false }} />
    )
    expect(emptyHtml).toContain(STAFF_IMPORT_LOGIN_NOTE)
    expect(emptyHtml).toContain(STAFF_IMPORT_NO_STAFF_WARNING)

    const loadedHtml = renderToStaticMarkup(
      <StaffImportNotices staffBootstrap={{ importedStaffCount: 5, hasBootstrapAdmin: true }} />
    )
    expect(loadedHtml).toContain(STAFF_IMPORT_LOGIN_NOTE)
    expect(loadedHtml).not.toContain(STAFF_IMPORT_NO_STAFF_WARNING)
  })

  it("dashboard renders Logout control", () => {
    const html = renderToStaticMarkup(<ImportDashboard />)
    expect(html).toContain("Logout")
  })
})
