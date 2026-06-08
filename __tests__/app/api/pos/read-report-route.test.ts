import { POST } from "@/app/api/pos/read-report/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/build-pos-read-report", () => ({
  buildPosDailyReadReport: jest.fn(),
}))

jest.mock("@/lib/pos/verifyPosReportStaffCredentials", () => ({
  verifyPosReportStaffCredentials: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    sale: { findMany: jest.fn() },
    product: { findMany: jest.fn() },
    branchDayClose: { upsert: jest.fn(), create: jest.fn(), update: jest.fn() },
    accountingPeriod: { update: jest.fn(), upsert: jest.fn() },
    voucher: { create: jest.fn() },
  },
}))

import { getSession } from "@/lib/auth/session"
import { buildPosDailyReadReport } from "@/lib/pos/build-pos-read-report"
import { verifyPosReportStaffCredentials } from "@/lib/pos/verifyPosReportStaffCredentials"
import { prisma } from "@/lib/shared/prisma"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedBuild = buildPosDailyReadReport as jest.MockedFunction<
  typeof buildPosDailyReadReport
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
  bangkokDate: "2026-06-07",
  generatedAt: "2026-06-07T10:00:00.000Z",
  staffId: "001",
  staffName: "Collector",
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

describe("POST /api/pos/read-report", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns read-only report for X without writes", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedVerify.mockResolvedValue({
      ok: true,
      staff: { staffId: "001", name: "Test", id: "st1" },
    })
    mockedBuild.mockResolvedValue({ ...sampleReport, mode: "X" })

    const req = new Request("http://localhost/api/pos/read-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staffId: "001",
        password: "secret",
        mode: "X",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mode).toBe("X")
    expect(mockedBuild).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ mode: "X", branchId: "b1" })
    )
    expect(prisma.branchDayClose.upsert).not.toHaveBeenCalled()
    expect(prisma.accountingPeriod.update).not.toHaveBeenCalled()
    expect(prisma.voucher.create).not.toHaveBeenCalled()
  })

  it("uses same builder for Z with no mutation side effects", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedVerify.mockResolvedValue({
      ok: true,
      staff: { staffId: "001", name: "Test", id: "st1" },
    })
    mockedBuild.mockResolvedValue(sampleReport)

    const req = new Request("http://localhost/api/pos/read-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staffId: "001",
        password: "secret",
        mode: "Z",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockedBuild).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ mode: "Z" })
    )
    expect(prisma.branchDayClose.create).not.toHaveBeenCalled()
    expect(prisma.branchDayClose.update).not.toHaveBeenCalled()
  })
})
