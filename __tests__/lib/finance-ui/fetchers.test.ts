import {
  buildReconciliationQuery,
  fetchInventoryReconciliation,
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
