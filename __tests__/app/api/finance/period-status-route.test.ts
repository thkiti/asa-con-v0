import { NextRequest } from "next/server"
import { getSession } from "@/lib/auth"
import { PATCH } from "@/app/api/finance/period/[id]/status/route"

jest.mock("@/lib/auth", () => {
  const actual = jest.requireActual<typeof import("@/lib/auth")>("@/lib/auth")
  return {
    ...actual,
    getSession: jest.fn(),
  }
})

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>

function patchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/finance/period/period-1/status", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("PATCH finance/period/[id]/status", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null)

    const req = patchRequest({ nextStatus: "SOFT_CLOSED", reason: "Month-end" })
    const res = await PATCH(req, { params: Promise.resolve({ id: "period-1" }) })

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({ code: "UNAUTHENTICATED" })
  })

  it("returns 403 for SH_STAFF session", async () => {
    mockGetSession.mockResolvedValue({
      sessionId: "sess-1",
      role: "SH_STAFF",
      staffId: "staff-1",
      name: "Shop Staff",
      branchId: "branch-1",
    })

    const req = patchRequest({ nextStatus: "SOFT_CLOSED", reason: "Month-end" })
    const res = await PATCH(req, { params: Promise.resolve({ id: "period-1" }) })

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({ code: "FORBIDDEN" })
  })

  it("returns 501 when authenticated period admin passes validation", async () => {
    mockGetSession.mockResolvedValue({
      sessionId: "sess-1",
      role: "HO_FINANCE",
      staffId: "staff-1",
      name: "Finance User",
      branchId: "branch-ho",
    })

    const req = patchRequest({
      nextStatus: "SOFT_CLOSED",
      reason: "Month-end close",
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "period-1" }) })

    expect(res.status).toBe(501)
    await expect(res.json()).resolves.toEqual({
      error: "Period status workflow not implemented",
      code: "NOT_IMPLEMENTED",
    })
  })

  it("returns 400 for invalid nextStatus", async () => {
    mockGetSession.mockResolvedValue({
      sessionId: "sess-1",
      role: "HO_FINANCE",
      staffId: "staff-1",
      name: "Finance User",
      branchId: "branch-ho",
    })

    const req = patchRequest({ nextStatus: "ARCHIVED" })
    const res = await PATCH(req, { params: Promise.resolve({ id: "period-1" }) })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ code: "INVALID_STATUS" })
  })
})
