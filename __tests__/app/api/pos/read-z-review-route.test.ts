import { POST } from "@/app/api/pos/read-z-review/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/build-pos-read-report", () => ({
  buildPosDailyReadReport: jest.fn(),
  buildPosReadZCumulativeToDateReport: jest.fn(),
  validateReadZBangkokDate: jest.fn(() => null),
}))

jest.mock("@/lib/pos/bangkokDayBounds", () => ({
  bangkokCalendarYmd: jest.fn(() => "2026-06-27"),
}))

jest.mock("@/lib/pos/verifyPosReportStaffCredentials", () => ({
  verifyPosReportStaffCredentials: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({ prisma: {} }))

import { getSession } from "@/lib/auth/session"
import {
  buildPosDailyReadReport,
  buildPosReadZCumulativeToDateReport,
} from "@/lib/pos/build-pos-read-report"
import { verifyPosReportStaffCredentials } from "@/lib/pos/verifyPosReportStaffCredentials"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedDaily = buildPosDailyReadReport as jest.MockedFunction<
  typeof buildPosDailyReadReport
>
const mockedCumulative = buildPosReadZCumulativeToDateReport as jest.MockedFunction<
  typeof buildPosReadZCumulativeToDateReport
>
const mockedVerify = verifyPosReportStaffCredentials as jest.MockedFunction<
  typeof verifyPosReportStaffCredentials
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

const sampleReport = {
  mode: "Z" as const,
  bangkokDate: "2026-06-20",
  readZScope: "daily" as const,
  readZViewDate: "2026-06-20",
  generatedAt: "2026-06-20T10:00:00.000Z",
  staffId: "103",
  staffName: "Somsak",
  branchCode: "SH001",
  branchName: "Chidlom",
  groupLines: [],
  paymentLines: [],
  grandTotal: 0,
  saleCount: 0,
  refundCount: 0,
  refundTotal: 0,
  netTotal: 0,
}

describe("POST /api/pos/read-z-review", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue(shopSession)
  })

  it("loads daily review for shop session without credentials", async () => {
    mockedDaily.mockResolvedValue(sampleReport)

    const res = await POST(
      new Request("http://localhost/api/pos/read-z-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "daily",
          bangkokDate: "2026-06-20",
        }),
      })
    )

    expect(res.status).toBe(200)
    expect(mockedVerify).not.toHaveBeenCalled()
    expect(mockedDaily).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        branchId: "b1",
        mode: "Z",
        bangkokDate: "2026-06-20",
        staffId: "103",
        staffName: "Somsak",
      })
    )
  })

  it("loads daily review when staff credentials are provided", async () => {
    mockedVerify.mockResolvedValue({
      ok: true,
      staff: { staffId: "001", name: "HO", id: "s1" },
    })
    mockedDaily.mockResolvedValue(sampleReport)

    const res = await POST(
      new Request("http://localhost/api/pos/read-z-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: "001",
          password: "pw",
          scope: "daily",
          bangkokDate: "2026-06-20",
        }),
      })
    )

    expect(res.status).toBe(200)
    expect(mockedDaily).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ mode: "Z", bangkokDate: "2026-06-20" })
    )
  })

  it("loads cumulative to-date through selected date for shop session", async () => {
    mockedCumulative.mockResolvedValue({
      ...sampleReport,
      readZScope: "cumulative-to-date",
      readZViewDate: "2026-06-20",
      bangkokDateFrom: "2026-06-01",
      bangkokDateTo: "2026-06-20",
      bangkokDate: "2026-06-01 – 2026-06-20",
    })

    const res = await POST(
      new Request("http://localhost/api/pos/read-z-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "cumulative-to-date",
          bangkokDate: "2026-06-20",
        }),
      })
    )

    expect(res.status).toBe(200)
    expect(mockedCumulative).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ endYmd: "2026-06-20" })
    )
  })

  it("requires bangkokDate for cumulative scope", async () => {
    const res = await POST(
      new Request("http://localhost/api/pos/read-z-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "cumulative-to-date",
        }),
      })
    )

    expect(res.status).toBe(400)
    expect(mockedCumulative).not.toHaveBeenCalled()
  })
})
