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

  it("postImportDryRun sends entity in body and returns envelope", async () => {
    const envelope = {
      success: true,
      failed: false,
      mode: "dry-run",
      entity: "product",
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      warnings: [],
      report: {
        profile: "devboard-v1",
        mode: "dry-run",
        sourceDir: "data/legacy/devboard-v1",
        startedAt: "",
        completedAt: "",
        phases: [],
        totals: { errors: 0 },
      },
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => envelope,
    })

    await expect(postImportDryRun("product")).resolves.toEqual(envelope)
    expect(global.fetch).toHaveBeenCalledWith("/api/system/import/dry-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "product", profile: "devboard-v1" }),
    })
  })

  it("postImportApply returns failed envelope on 409 without throwing", async () => {
    const failedEnvelope = {
      success: false,
      failed: true,
      mode: "apply",
      entity: "staff",
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: ["missing branch"],
      warnings: [],
      report: {
        profile: "devboard-v1",
        mode: "apply",
        sourceDir: "data/legacy/devboard-v1",
        startedAt: "",
        completedAt: "",
        phases: [],
        totals: { errors: 1, inserted: 0, updated: 0 },
      },
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => failedEnvelope,
    })

    await expect(
      postImportApply({
        entity: "staff",
        dryRunReportId: "report-1.json",
      })
    ).resolves.toEqual(failedEnvelope)
  })

  it("postImportApply sends confirm true and dryRunReportId", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        failed: false,
        mode: "apply",
        entity: "staff",
        inserted: 1,
        updated: 0,
        skipped: 0,
        errors: [],
        warnings: [],
        report: { mode: "apply", totals: { errors: 0 } },
      }),
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
