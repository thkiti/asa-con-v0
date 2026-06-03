import { NextRequest } from "next/server"
import { POST } from "@/app/api/master/branches/route"
import { PATCH } from "@/app/api/master/branches/[id]/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/master", () => {
  const actual = jest.requireActual<typeof import("@/lib/master")>("@/lib/master")
  return {
    ...actual,
    listBranches: jest.fn(),
    createBranch: jest.fn(),
    patchBranch: jest.fn(),
  }
})

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { createBranch, patchBranch } from "@/lib/master"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedCreateBranch = createBranch as jest.MockedFunction<typeof createBranch>
const mockedPatchBranch = patchBranch as jest.MockedFunction<typeof patchBranch>

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
  id: "b2",
  code: "SH002",
  name: "Shop 2",
  type: "SH" as const,
  isActive: true,
  deleted: false,
}

describe("POST /api/master/branches", () => {
  beforeEach(() => {
    mockedGetSession.mockReset()
    mockedCreateBranch.mockReset()
  })

  it("creates branch for HO_ADMIN", async () => {
    mockedGetSession.mockResolvedValue(hoAdminSession)
    mockedCreateBranch.mockResolvedValue(sampleItem)

    const req = new NextRequest("http://localhost/api/master/branches", {
      method: "POST",
      body: JSON.stringify({
        code: "SH002",
        name: "Shop 2",
        type: "SH",
        isActive: true,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    await expect(res.json()).resolves.toEqual({ item: sampleItem })
    expect(mockedCreateBranch).toHaveBeenCalled()
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/master/branches", {
      method: "POST",
      body: JSON.stringify({ code: "SH002", name: "X", type: "SH" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(mockedCreateBranch).not.toHaveBeenCalled()
  })

  it("returns 403 for SH_STAFF", async () => {
    mockedGetSession.mockResolvedValue({ ...hoAdminSession, role: "SH_STAFF" })

    const req = new NextRequest("http://localhost/api/master/branches", {
      method: "POST",
      body: JSON.stringify({ code: "SH002", name: "X", type: "SH" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })
})

describe("PATCH /api/master/branches/[id]", () => {
  beforeEach(() => {
    mockedGetSession.mockReset()
    mockedPatchBranch.mockReset()
  })

  it("updates branch for HO_ADMIN", async () => {
    mockedGetSession.mockResolvedValue(hoAdminSession)
    mockedPatchBranch.mockResolvedValue({ ...sampleItem, name: "Renamed" })

    const req = new NextRequest("http://localhost/api/master/branches/b2", {
      method: "PATCH",
      body: JSON.stringify({ name: "Renamed", isActive: true }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "b2" }) })
    expect(res.status).toBe(200)
    expect(mockedPatchBranch).toHaveBeenCalledWith({}, "b2", {
      action: "update",
      name: "Renamed",
      isActive: true,
    })
  })

  it("returns CODE_IMMUTABLE when code sent", async () => {
    mockedGetSession.mockResolvedValue(hoAdminSession)

    const req = new NextRequest("http://localhost/api/master/branches/b2", {
      method: "PATCH",
      body: JSON.stringify({ code: "SH999", name: "X", isActive: true }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "b2" }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe("CODE_IMMUTABLE")
    expect(mockedPatchBranch).not.toHaveBeenCalled()
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/master/branches/b2", {
      method: "PATCH",
      body: JSON.stringify({ deleted: true }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "b2" }) })
    expect(res.status).toBe(401)
  })
})
