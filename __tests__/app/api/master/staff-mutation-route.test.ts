import { NextRequest } from "next/server"
import { POST } from "@/app/api/master/staff/route"
import { PATCH } from "@/app/api/master/staff/[id]/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/master", () => {
  const actual = jest.requireActual<typeof import("@/lib/master")>("@/lib/master")
  return {
    ...actual,
    listStaff: jest.fn(),
    createStaff: jest.fn(),
    patchStaff: jest.fn(),
  }
})

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { createStaff, patchStaff } from "@/lib/master"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedCreateStaff = createStaff as jest.MockedFunction<typeof createStaff>
const mockedPatchStaff = patchStaff as jest.MockedFunction<typeof patchStaff>

const hoAdminSession = {
  sessionId: "s1",
  userId: "u1",
  role: "HO_ADMIN" as const,
  staffId: "001",
  name: "Admin",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "HO",
}

const sampleItem = {
  id: "s2",
  staffId: "002",
  name: "Shop User",
  role: "SH_STAFF" as const,
  deleted: false,
  branchId: "b2",
  branchCode: "SH999",
  branchName: "Buffer",
}

describe("POST /api/master/staff", () => {
  beforeEach(() => {
    mockedGetSession.mockReset()
    mockedCreateStaff.mockReset()
  })

  it("creates staff for HO_ADMIN", async () => {
    mockedGetSession.mockResolvedValue(hoAdminSession)
    mockedCreateStaff.mockResolvedValue(sampleItem)

    const req = new NextRequest("http://localhost/api/master/staff", {
      method: "POST",
      body: JSON.stringify({
        staffId: "002",
        name: "Shop User",
        role: "SH_STAFF",
        branchId: "b2",
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    await expect(res.json()).resolves.toEqual({ item: sampleItem })
  })

  it("returns 403 for SH_STAFF", async () => {
    mockedGetSession.mockResolvedValue({ ...hoAdminSession, role: "SH_STAFF" })

    const req = new NextRequest("http://localhost/api/master/staff", {
      method: "POST",
      body: JSON.stringify({
        staffId: "002",
        name: "X",
        role: "SH_STAFF",
        branchId: "b2",
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
    expect(mockedCreateStaff).not.toHaveBeenCalled()
  })
})

describe("PATCH /api/master/staff/[id]", () => {
  beforeEach(() => {
    mockedGetSession.mockReset()
    mockedPatchStaff.mockReset()
  })

  it("passes actorStaffId to patchStaff", async () => {
    mockedGetSession.mockResolvedValue(hoAdminSession)
    mockedPatchStaff.mockResolvedValue(sampleItem)

    const req = new NextRequest("http://localhost/api/master/staff/s2", {
      method: "PATCH",
      body: JSON.stringify({ deleted: true }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "s2" }) })
    expect(res.status).toBe(200)
    expect(mockedPatchStaff).toHaveBeenCalledWith(
      {},
      "s2",
      { action: "delete" },
      { actorStaffId: "001" }
    )
  })

  it("returns STAFF_ID_IMMUTABLE when staffId sent", async () => {
    mockedGetSession.mockResolvedValue(hoAdminSession)

    const req = new NextRequest("http://localhost/api/master/staff/s2", {
      method: "PATCH",
      body: JSON.stringify({
        staffId: "999",
        name: "X",
        role: "SH_STAFF",
        branchId: "b2",
      }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "s2" }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe("STAFF_ID_IMMUTABLE")
  })
})
