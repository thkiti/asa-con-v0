import { GET } from "@/app/api/shop/sales-targets/branches/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/shop", () => ({
  listActiveShopBranches: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { listActiveShopBranches } from "@/lib/shop"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedList = listActiveShopBranches as jest.MockedFunction<
  typeof listActiveShopBranches
>

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

describe("GET /api/shop/sales-targets/branches", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns branches for HO_ADMIN with real shops before smoke/test shops", async () => {
    mockedGetSession.mockResolvedValue(hoAdminSession)
    mockedList.mockResolvedValue([
      { id: "p1c", code: "P1C01", name: "P1C Smoke" },
      { id: "sh1", code: "SH001", name: "Shop" },
      { id: "smoke", code: "SMOKE01", name: "Smoke Test" },
    ])

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.branches.map((b: { code: string }) => b.code)).toEqual([
      "SH001",
      "P1C01",
      "SMOKE01",
    ])
  })

  it("returns 403 for SH_STAFF", async () => {
    mockedGetSession.mockResolvedValue({ ...hoAdminSession, role: "SH_STAFF" })

    const res = await GET()
    expect(res.status).toBe(403)
  })
})
