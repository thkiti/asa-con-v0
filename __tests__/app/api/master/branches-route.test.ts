import { NextRequest } from "next/server"
import { GET } from "@/app/api/master/branches/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/master", () => ({
  parseBranchListQuery: jest.requireActual("@/lib/master/parse-queries")
    .parseBranchListQuery,
  listBranches: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { listBranches } from "@/lib/master"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedListBranches = listBranches as jest.MockedFunction<typeof listBranches>

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

describe("GET /api/master/branches", () => {
  beforeEach(() => {
    mockedGetSession.mockReset()
    mockedListBranches.mockReset()
  })

  it("returns items for HO_ADMIN", async () => {
    mockedGetSession.mockResolvedValue(hoAdminSession)
    mockedListBranches.mockResolvedValue([
      {
        id: "b1",
        code: "HO999",
        name: "Head Office",
        type: "HO",
        isActive: true,
        deleted: false,
      },
    ])

    const req = new NextRequest(
      "http://localhost/api/master/branches?mode=active&q=ho"
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      items: [expect.objectContaining({ code: "HO999" })],
    })
    expect(mockedListBranches).toHaveBeenCalled()
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/master/branches")
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(mockedListBranches).not.toHaveBeenCalled()
  })

  it("returns 403 for SH_STAFF", async () => {
    mockedGetSession.mockResolvedValue({
      ...hoAdminSession,
      role: "SH_STAFF",
    })

    const req = new NextRequest("http://localhost/api/master/branches")
    const res = await GET(req)
    expect(res.status).toBe(403)
    expect(mockedListBranches).not.toHaveBeenCalled()
  })
})
