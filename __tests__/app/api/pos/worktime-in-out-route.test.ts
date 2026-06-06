import { POST as POST_IN } from "@/app/api/pos/worktime/in/route"
import { POST as POST_OUT } from "@/app/api/pos/worktime/out/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/worktime", () => ({
  recordPosWorktimeClockIn: jest.fn(),
  recordPosWorktimeClockOut: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import {
  recordPosWorktimeClockIn,
  recordPosWorktimeClockOut,
} from "@/lib/pos/worktime"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedIn = recordPosWorktimeClockIn as jest.MockedFunction<
  typeof recordPosWorktimeClockIn
>
const mockedOut = recordPosWorktimeClockOut as jest.MockedFunction<
  typeof recordPosWorktimeClockOut
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
  days: [
    {
      dateKey: "2026-06-06",
      day: 6,
      clockIn: "09:15:00",
      clockOut: null,
      isToday: true,
    },
  ],
}

describe("POST /api/pos/worktime/in", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("records clock-in for session staff", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedIn.mockResolvedValue(sampleView)

    const res = await POST_IN()
    expect(res.status).toBe(200)
    expect(mockedIn).toHaveBeenCalledWith({}, { branchId: "b1", staffId: "103" })
  })
})

describe("POST /api/pos/worktime/out", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("records clock-out for session staff", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedOut.mockResolvedValue({
      ...sampleView,
      days: [{ ...sampleView.days[0]!, clockOut: "18:05" }],
    })

    const res = await POST_OUT()
    expect(res.status).toBe(200)
    expect(mockedOut).toHaveBeenCalledWith({}, { branchId: "b1", staffId: "103" })
  })
})
