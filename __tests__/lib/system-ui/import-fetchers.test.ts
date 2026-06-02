import {
  fetchImportReport,
  fetchImportReports,
  fetchImportStatus,
  postImportApply,
  postImportDryRun,
  postLogout,
} from "@/lib/system-ui/import-fetchers"

describe("system import fetchers", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("fetchImportStatus calls status API", async () => {
    const dto = {
      archive: { archiveRoot: "data/legacy/devboard-v1", manifestPresent: true, files: [], warnings: [] },
      latestReports: [],
      staffBootstrap: { importedStaffCount: 0, hasBootstrapAdmin: false },
      productionGuardActive: false,
      importAllowProduction: false,
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => dto,
    })

    await expect(fetchImportStatus()).resolves.toEqual(dto)
    expect(global.fetch).toHaveBeenCalledWith("/api/system/import/status")
  })

  it("postImportDryRun sends entity in body", async () => {
    const report = { profile: "devboard-v1", mode: "dry-run", totals: { errors: 0 } }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => report,
    })

    await postImportDryRun("product")
    expect(global.fetch).toHaveBeenCalledWith("/api/system/import/dry-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "product", profile: "devboard-v1" }),
    })
  })

  it("postImportApply sends confirm true and dryRunReportId", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ mode: "apply" }),
    })

    await postImportApply({
      entity: "staff",
      dryRunReportId: "report-1.json",
    })

    expect(global.fetch).toHaveBeenCalledWith("/api/system/import/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "staff",
        dryRunReportId: "report-1.json",
        confirm: true,
        profile: "devboard-v1",
      }),
    })
  })

  it("fetchImportReports filters by entity", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ reports: [] }),
    })

    await fetchImportReports("reference-stock")
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/system/import/reports?entity=reference-stock&limit=10"
    )
  })

  it("fetchImportReport loads report by id", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ mode: "dry-run" }),
    })

    await fetchImportReport("report-1.json")
    expect(global.fetch).toHaveBeenCalledWith("/api/system/import/reports/report-1.json")
  })

  it("postLogout calls auth logout API", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ redirectTo: "/login" }),
    })

    await expect(postLogout()).resolves.toEqual({ redirectTo: "/login" })
    expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" })
  })
})
