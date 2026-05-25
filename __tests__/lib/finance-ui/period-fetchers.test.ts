import {
  fetchAccountingPeriods,
  fetchSessionDisplay,
  patchPeriodStatus,
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

  it("throws with API error body on failure", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: "Bad Request",
      json: async () => ({ error: "Invalid branch" }),
    })

    await expect(fetchAccountingPeriods({})).rejects.toThrow("Invalid branch")
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

describe("patchPeriodStatus", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("PATCHes status route and returns JSON on success", async () => {
    const dto = {
      id: "period-1",
      status: "SOFT_CLOSED" as const,
      closedAt: "2026-05-23T12:00:00.000Z",
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => dto,
    })

    await expect(
      patchPeriodStatus("period-1", {
        nextStatus: "SOFT_CLOSED",
        reason: "Month-end",
      })
    ).resolves.toEqual(dto)
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/period/period-1/status",
      expect.objectContaining({
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nextStatus: "SOFT_CLOSED",
          reason: "Month-end",
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
      patchPeriodStatus("period-1", {
        nextStatus: "HARD_CLOSED",
      })
    ).rejects.toThrow("Transition not allowed")
  })
})
