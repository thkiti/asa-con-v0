import {
  fetchAccountingPeriods,
  fetchCloseEvidence,
  fetchSessionDisplay,
  patchAccountingPeriod,
  postAccountingPeriod,
} from "@/lib/finance-ui/period-fetchers"

describe("fetchAccountingPeriods", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("calls periods API and returns JSON on success", async () => {
    const dto = {
      periods: [
        {
          id: "period-1",
          periodKey: "2026-05",
          branchId: "branch-1",
          branchName: "Main Shop",
          status: "OPEN" as const,
          openedAt: "2026-05-01T00:00:00.000Z",
          closedAt: null,
        },
      ],
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => dto,
    })

    await expect(fetchAccountingPeriods({ branchId: "branch-1" })).resolves.toEqual(
      dto
    )
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/periods?branchId=branch-1"
    )
  })

  it("builds query with branchId, periodKey, and status filters", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ periods: [] }),
    })

    await fetchAccountingPeriods({
      branchId: "branch-1",
      periodKey: "2026-05",
      status: "OPEN",
    })

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/periods?branchId=branch-1&periodKey=2026-05&status=OPEN"
    )
  })

  it("omits status query param when status is ALL or undefined", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ periods: [] }),
    })

    await fetchAccountingPeriods({ status: "ALL" })
    expect(global.fetch).toHaveBeenCalledWith("/api/finance/periods")

    await fetchAccountingPeriods({ branchId: "branch-1", status: undefined })
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/periods?branchId=branch-1"
    )
  })

  it("throws with API error body on failure", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: "Bad Request",
      json: async () => ({ error: "Invalid branch" }),
    })

    await expect(fetchAccountingPeriods({})).rejects.toThrow("Invalid branch")
  })
})

describe("postAccountingPeriod", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("POSTs to periods API and returns period on success", async () => {
    const dto = {
      period: {
        id: "period-1",
        periodKey: "2026-05",
        branchId: "branch-1",
        branchName: "Main Shop",
        status: "OPEN" as const,
        openedAt: "2026-05-01T00:00:00.000Z",
        closedAt: null,
      },
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => dto,
    })

    await expect(
      postAccountingPeriod({ branchId: "branch-1", periodKey: "2026-05" })
    ).resolves.toEqual(dto)
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/periods",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          branchId: "branch-1",
          periodKey: "2026-05",
        }),
      })
    )
  })

  it("throws with API error body on failure", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: "Bad Request",
      json: async () => ({ error: "branchId and periodKey are required" }),
    })

    await expect(
      postAccountingPeriod({ branchId: "", periodKey: "2026-05" })
    ).rejects.toThrow("branchId and periodKey are required")
  })
})

describe("patchAccountingPeriod", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("PATCHes periods API and returns period on success", async () => {
    const dto = {
      period: {
        id: "period-1",
        periodKey: "2026-05",
        branchId: "branch-1",
        branchName: "Main Shop",
        status: "SOFT_CLOSED" as const,
        openedAt: "2026-05-01T00:00:00.000Z",
        closedAt: "2026-05-23T12:00:00.000Z",
      },
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => dto,
    })

    await expect(
      patchAccountingPeriod({
        branchId: "branch-1",
        periodKey: "2026-05",
        action: "SOFT_CLOSE",
      })
    ).resolves.toEqual(dto)
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/periods",
      expect.objectContaining({
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          branchId: "branch-1",
          periodKey: "2026-05",
          action: "SOFT_CLOSE",
        }),
      })
    )
  })

  it("throws with API error body on failure", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: "Forbidden",
      json: async () => ({ error: "Transition not allowed" }),
    })

    await expect(
      patchAccountingPeriod({
        branchId: "branch-1",
        periodKey: "2026-05",
        action: "HARD_CLOSE",
      })
    ).rejects.toThrow("Transition not allowed")
  })
})

describe("fetchCloseEvidence", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("GETs close-evidence API and returns evidence DTO", async () => {
    const dto = {
      evidence: {
        id: "evidence-1",
        periodId: "period-1",
        periodKey: "2026-05",
      },
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => dto,
    })

    await expect(fetchCloseEvidence("period-1")).resolves.toEqual(dto)
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/periods/period-1/close-evidence"
    )
  })

  it("throws with CLOSE_EVIDENCE_NOT_FOUND on 404", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: "Not Found",
      json: async () => ({
        error: "Close evidence not found for period: period-open",
        code: "CLOSE_EVIDENCE_NOT_FOUND",
      }),
    })

    await expect(fetchCloseEvidence("period-open")).rejects.toThrow(
      "Close evidence not found for period: period-open"
    )
  })
})

describe("fetchSessionDisplay", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("returns name and role when session is authenticated", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { name: "Finance User", role: "HO_FINANCE" },
      }),
    })

    await expect(fetchSessionDisplay()).resolves.toEqual({
      name: "Finance User",
      role: "HO_FINANCE",
    })
    expect(global.fetch).toHaveBeenCalledWith("/api/auth/session")
  })

  it("returns null when session is unauthenticated", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ user: null }),
    })

    await expect(fetchSessionDisplay()).resolves.toBeNull()
  })
})
