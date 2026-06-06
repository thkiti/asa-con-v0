import { NextRequest } from "next/server"
import { GET, PUT } from "@/app/api/shop/sales-targets/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/shop", () => ({
  getBranchSalesTarget: jest.fn(),
  upsertBranchSalesTarget: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { getBranchSalesTarget, upsertBranchSalesTarget } from "@/lib/shop"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedGet = getBranchSalesTarget as jest.MockedFunction<
  typeof getBranchSalesTarget
>
const mockedUpsert = upsertBranchSalesTarget as jest.MockedFunction<
  typeof upsertBranchSalesTarget
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

const sampleTarget = {
  branchId: "sh1",
  year: 2026,
  month: 6,
  monthlyTotal: "100000.00",
  weekPattern: [1, 1, 1, 1, 1, 1, 1],
  exists: true,
}

describe("GET /api/shop/sales-targets", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns target for HO_ADMIN", async () => {
    mockedGetSession.mockResolvedValue(hoAdminSession)
    mockedGet.mockResolvedValue(sampleTarget)

    const req = new NextRequest(
      "http://localhost/api/shop/sales-targets?branchId=sh1&year=2026&month=6"
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.monthlyTotal).toBe("100000.00")
  })

  it("returns 403 for SH_STAFF", async () => {
    mockedGetSession.mockResolvedValue({ ...hoAdminSession, role: "SH_STAFF" })

    const req = new NextRequest(
      "http://localhost/api/shop/sales-targets?branchId=sh1&year=2026&month=6"
    )
    const res = await GET(req)
    expect(res.status).toBe(403)
  })
})

describe("PUT /api/shop/sales-targets", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("saves target for HO_FINANCE", async () => {
    mockedGetSession.mockResolvedValue({ ...hoAdminSession, role: "HO_FINANCE" })
    mockedUpsert.mockResolvedValue({ ...sampleTarget, id: "t1" })

    const req = new NextRequest("http://localhost/api/shop/sales-targets", {
      method: "PUT",
      body: JSON.stringify({
        branchId: "sh1",
        year: 2026,
        month: 6,
        monthlyTotal: "100000",
        weekPattern: [1, 1, 1, 1, 1, 1, 1],
      }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    expect(mockedUpsert).toHaveBeenCalled()
  })

  it("returns 403 for HO_OPERATIONS", async () => {
    mockedGetSession.mockResolvedValue({
      ...hoAdminSession,
      role: "HO_OPERATIONS",
    })

    const req = new NextRequest("http://localhost/api/shop/sales-targets", {
      method: "PUT",
      body: JSON.stringify({
        branchId: "sh1",
        year: 2026,
        month: 6,
        monthlyTotal: "100000",
        weekPattern: [1, 1, 1, 1, 1, 1, 1],
      }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(403)
  })
})
