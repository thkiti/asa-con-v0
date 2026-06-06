import { NextRequest } from "next/server"
import { GET } from "@/app/api/shop/sales-dashboard/day/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/shop/sales-dashboard", () => ({
  getSalesDashboardDayDetail: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { getSalesDashboardDayDetail } from "@/lib/shop/sales-dashboard"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedDetail = getSalesDashboardDayDetail as jest.MockedFunction<
  typeof getSalesDashboardDayDetail
>

const hoFinanceSession = {
  sessionId: "s1",
  userId: "u1",
  role: "HO_FINANCE" as const,
  staffId: "001",
  name: "Finance",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "HO",
}

describe("GET /api/shop/sales-dashboard/day", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns branch summary when dateKey only", async () => {
    mockedGetSession.mockResolvedValue(hoFinanceSession)
    mockedDetail.mockResolvedValue({
      mode: "branch-summary",
      dateKey: "2026-06-05",
      branches: [],
    })

    const req = new NextRequest(
      "http://localhost/api/shop/sales-dashboard/day?dateKey=2026-06-05"
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mode).toBe("branch-summary")
  })

  it("returns 403 for SH_STAFF", async () => {
    mockedGetSession.mockResolvedValue({ ...hoFinanceSession, role: "SH_STAFF" })

    const req = new NextRequest(
      "http://localhost/api/shop/sales-dashboard/day?dateKey=2026-06-05"
    )
    const res = await GET(req)
    expect(res.status).toBe(403)
  })
})
