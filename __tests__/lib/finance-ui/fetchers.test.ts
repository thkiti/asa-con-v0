import {
  buildReconciliationQuery,
  createReconciliationSnapshot,
  fetchInventoryReconciliation,
  fetchReconciliationDashboard,
  fetchReconciliationIssues,
  fetchReconciliationSnapshotById,
  fetchReconciliationSnapshots,
  fetchSalesReconciliation,
} from "@/lib/finance-ui/fetchers"

describe("buildReconciliationQuery", () => {
  it("builds query string from filter values", () => {
    expect(
      buildReconciliationQuery({
        branchId: " branch-1 ",
        from: "2026-05-01",
        to: "2026-05-31",
      })
    ).toBe("?branchId=branch-1&from=2026-05-01&to=2026-05-31")
  })

  it("returns empty string when filter is empty", () => {
    expect(buildReconciliationQuery({})).toBe("")
  })

  it("omits blank fields", () => {
    expect(buildReconciliationQuery({ branchId: "  ", from: "2026-05-01" })).toBe(
      "?from=2026-05-01"
    )
  })
})

describe("fetchInventoryReconciliation", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("calls inventory API and returns JSON on success", async () => {
    const dto = {
      filter: { branchId: "b1" },
      operationalTotalValue: "100.00",
      glInventoryBalance: "100.00",
      variances: [],
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => dto,
    })

    await expect(
      fetchInventoryReconciliation({ branchId: "b1" })
    ).resolves.toEqual(dto)
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/reconciliation/inventory?branchId=b1"
    )
  })

  it("throws with API error body on failure", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: "Bad Request",
      json: async () => ({ error: "Invalid date range" }),
    })

    await expect(fetchInventoryReconciliation({})).rejects.toThrow(
      "Invalid date range"
    )
  })
})

describe("fetchSalesReconciliation", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("calls sales API and returns JSON on success", async () => {
    const dto = {
      filter: {},
      operationalRevenue: "500.00",
      glRevenueBalance: "500.00",
      paymentBreakdown: [],
      variances: [],
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => dto,
    })

    await expect(fetchSalesReconciliation({})).resolves.toEqual(dto)
    expect(global.fetch).toHaveBeenCalledWith("/api/finance/reconciliation/sales")
  })
})

describe("fetchReconciliationDashboard", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("fetches inventory and sales APIs in parallel", async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          filter: {},
          operationalTotalValue: "100",
          glInventoryBalance: "100",
          variances: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          filter: {},
          operationalRevenue: "200",
          glRevenueBalance: "200",
          paymentBreakdown: [],
          variances: [],
        }),
      })

    const result = await fetchReconciliationDashboard({
      branchId: "branch-1",
      periodKey: "2026-05",
    })

    expect(result.inventory.operationalTotalValue).toBe("100")
    expect(result.sales.operationalRevenue).toBe("200")
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/reconciliation/inventory?branchId=branch-1&from=2026-05-01&to=2026-05-31"
    )
  })
})

describe("fetchReconciliationIssues", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("calls issues API with drill-down filters", async () => {
    const dto = {
      filter: { domain: "revenue" },
      checkedSales: 1,
      checkedStockDocuments: 0,
      issueCount: 0,
      issues: [],
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => dto,
    })

    const result = await fetchReconciliationIssues({
      branchId: "branch-1",
      domain: "revenue",
      status: "VARIANCE",
    })

    expect(result).toEqual(dto)
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/reconciliation/issues?branchId=branch-1&status=VARIANCE&domain=revenue"
    )
  })

  it("throws with API error body on failure", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: "Bad Request",
      json: async () => ({ error: "Invalid filter" }),
    })

    await expect(fetchReconciliationIssues({})).rejects.toThrow("Invalid filter")
  })
})

describe("fetchReconciliationSnapshots", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("calls snapshots list API", async () => {
    const dto = { snapshots: [{ id: "snap-1" }] }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => dto,
    })

    await expect(
      fetchReconciliationSnapshots({ branchId: "branch-1", limit: 10 })
    ).resolves.toEqual(dto)
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/reconciliation/snapshots?branchId=branch-1&limit=10"
    )
  })
})

describe("fetchReconciliationSnapshotById", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("calls snapshot detail API", async () => {
    const dto = { snapshot: { id: "snap-1" } }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => dto,
    })

    await expect(fetchReconciliationSnapshotById("snap-1")).resolves.toEqual(dto)
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/reconciliation/snapshots/snap-1"
    )
  })
})

describe("createReconciliationSnapshot", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("POSTs capture body and returns snapshot", async () => {
    const dto = { snapshot: { id: "snap-new" } }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => dto,
    })

    const body = { periodKey: "2026-05", label: "Review" }
    await expect(createReconciliationSnapshot(body)).resolves.toEqual(dto)
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/reconciliation/snapshots",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    )
  })

  it("throws with API error body on failure", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: "Bad Request",
      json: async () => ({ error: "Invalid scope" }),
    })

    await expect(
      createReconciliationSnapshot({ from: "2026-05-01" })
    ).rejects.toThrow("Invalid scope")
  })
})
