import { NextRequest } from "next/server"
import { GET } from "@/app/api/shop/sales-dashboard/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/shop/sales-dashboard", () => ({
  buildSalesDashboardView: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { buildSalesDashboardView } from "@/lib/shop/sales-dashboard"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedBuild = buildSalesDashboardView as jest.MockedFunction<
  typeof buildSalesDashboardView
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

const sampleView = {
  scope: "company" as const,
  year: 2026,
  month: 6,
  branches: [],
  monthSummary: {
    lastMonthSales: "800.00",
    grossSales: "1000.00",
    refunds: "100.00",
    netSales: "900.00",
    billCount: 42,
  },
  previousMonthWeekdayPatterns: ["0.00", "1.10", "1.00", "1.00", "1.00", "1.28", "0.00"],
  days: [],
  hasAnyTarget: false,
}

describe("GET /api/shop/sales-dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns dashboard for HO_ADMIN without branchId (All Company)", async () => {
    mockedGetSession.mockResolvedValue(hoAdminSession)
    mockedBuild.mockResolvedValue(sampleView)

    const req = new NextRequest(
      "http://localhost/api/shop/sales-dashboard?year=2026&month=6"
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.scope).toBe("company")
    expect(mockedBuild).toHaveBeenCalledWith({}, { year: 2026, month: 6 })
  })

  it("returns 403 for SH_STAFF", async () => {
    mockedGetSession.mockResolvedValue({ ...hoAdminSession, role: "SH_STAFF" })

    const req = new NextRequest(
      "http://localhost/api/shop/sales-dashboard?year=2026&month=6"
    )
    const res = await GET(req)
    expect(res.status).toBe(403)
  })
})
