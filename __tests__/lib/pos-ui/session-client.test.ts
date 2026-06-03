import { fetchSessionUser } from "@/lib/pos-ui/session-client"
import type { SessionUserApi } from "@/lib/auth/session-user-api"

const sampleUser: SessionUserApi = {
  userId: "u1",
  staffId: "S001",
  name: "Branch Staff",
  role: "SH_STAFF",
  branchId: "b1",
  branchCode: "SH01",
  branchName: "Shop One",
}

describe("pos-ui/session-client", () => {
  it("returns user on 200 with user payload", async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: sampleUser }),
    })

    const result = await fetchSessionUser(fetchFn as typeof fetch)
    expect(result).toEqual({ ok: true, user: sampleUser })
    expect(fetchFn).toHaveBeenCalledWith("/api/auth/session", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    })
  })

  it("returns 401 when user is null", async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: null }),
    })

    const result = await fetchSessionUser(fetchFn as typeof fetch)
    expect(result).toEqual({ ok: false, status: 401 })
  })

  it("returns status on HTTP error", async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    })

    const result = await fetchSessionUser(fetchFn as typeof fetch)
    expect(result).toEqual({ ok: false, status: 500 })
  })
})
