import { NextRequest } from "next/server"
import { GET } from "@/app/api/pos/worktime/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/worktime", () => ({
  buildPosWorktimeView: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { buildPosWorktimeView } from "@/lib/pos/worktime"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedBuild = buildPosWorktimeView as jest.MockedFunction<
  typeof buildPosWorktimeView
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

const sampleView = {
  branchCode: "SH001",
  monthLabel: "June 2026",
  summary: { workDays: 1, totalHours: "08:00:00", incompleteDays: 0 },
  days: [],
}

describe("GET /api/pos/worktime", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns view for session staff and branch only", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedBuild.mockResolvedValue(sampleView)

    const req = new NextRequest(
      "http://localhost/api/pos/worktime?branchId=other&staffId=999"
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockedBuild).toHaveBeenCalledWith({}, { branchId: "b1", staffId: "103" })
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/pos/worktime")
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})
