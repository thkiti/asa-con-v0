import { NextRequest } from "next/server"
import { GET } from "@/app/api/pos/target-vs-sales/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/target-vs-sales", () => ({
  buildPosTargetVsSalesSummary: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { buildPosTargetVsSalesSummary } from "@/lib/pos/target-vs-sales"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedBuild = buildPosTargetVsSalesSummary as jest.MockedFunction<
  typeof buildPosTargetVsSalesSummary
>

const shopSession = {
  sessionId: "s1",
  userId: "u1",
  role: "SH_STAFF" as const,
  staffId: "103",
  name: "Somsak",
  branchId: "b1",
  branchCode: "SH001",
  branchName: "Chidlom",
}

const sampleSummary = {
  branchCode: "SH001",
  monthLabel: "June 2026",
  today: { target: "9000.00", actual: "8500.00" },
  month: { target: "270000.00", actual: "245000.00", achievementPercent: "90.7" },
  days: [],
}

describe("GET /api/pos/target-vs-sales", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns summary for session branch", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedBuild.mockResolvedValue(sampleSummary)

    const req = new NextRequest(
      "http://localhost/api/pos/target-vs-sales?branchId=other-branch"
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockedBuild).toHaveBeenCalledWith({}, { branchId: "b1" })
    const body = await res.json()
    expect(body.branchCode).toBe("SH001")
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/pos/target-vs-sales")
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})
