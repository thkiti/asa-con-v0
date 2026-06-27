import { POST } from "@/app/api/pos/collect-report/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/build-pos-read-report", () => ({
  buildPosCollectReport: jest.fn(),
  validateCollectDateRange: jest.fn(() => null),
}))

jest.mock("@/lib/pos/verifyPosReportStaffCredentials", () => ({
  verifyPosReportStaffCredentials: jest.fn(),
}))

jest.mock("@/lib/pos/persist-collector-report", () => ({
  persistCollectorReport: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { buildPosCollectReport } from "@/lib/pos/build-pos-read-report"
import { persistCollectorReport } from "@/lib/pos/persist-collector-report"
import { verifyPosReportStaffCredentials } from "@/lib/pos/verifyPosReportStaffCredentials"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedBuild = buildPosCollectReport as jest.MockedFunction<
  typeof buildPosCollectReport
>
const mockedPersist = persistCollectorReport as jest.MockedFunction<
  typeof persistCollectorReport
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
  mode: "COLLECT" as const,
  bangkokDate: "2026-06-01 – 2026-06-07",
  bangkokDateFrom: "2026-06-01",
  bangkokDateTo: "2026-06-07",
  generatedAt: "2026-06-07T10:00:00.000Z",
  staffId: "001",
  staffName: "HO Collector",
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

describe("POST /api/pos/collect-report", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns preview report without persisting by default", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedVerify.mockResolvedValue({
      ok: true,
      staff: { staffId: "001", name: "HO Collector", id: "st-ho" },
    })
    mockedBuild.mockResolvedValue(sampleReport)

    const req = new Request("http://localhost/api/pos/collect-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staffId: "001",
        password: "secret",
        dateFrom: "2026-06-01",
        dateTo: "2026-06-07",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mode).toBe("COLLECT")
    expect(body.collectNo).toBeUndefined()
    expect(mockedPersist).not.toHaveBeenCalled()
  })

  it("persists CollectorReport when persist is true", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedVerify.mockResolvedValue({
      ok: true,
      staff: { staffId: "001", name: "HO Collector", id: "st-ho" },
    })
    mockedBuild.mockResolvedValue(sampleReport)
    mockedPersist.mockResolvedValue({
      collectNo: "COL-SH001-202606-0001",
      report: { ...sampleReport, collectNo: "COL-SH001-202606-0001" },
      collectorReportId: "col-1",
    })

    const req = new Request("http://localhost/api/pos/collect-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staffId: "001",
        password: "secret",
        dateFrom: "2026-06-01",
        dateTo: "2026-06-07",
        persist: true,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.collectNo).toBe("COL-SH001-202606-0001")
    expect(mockedPersist).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        branchId: "b1",
        staffId: "001",
        report: sampleReport,
      })
    )
  })

  it("rejects non-HO collector credentials", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedVerify.mockResolvedValue({ ok: false, code: "no_collect_permission" })

    const req = new Request("http://localhost/api/pos/collect-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staffId: "103",
        password: "secret",
        dateFrom: "2026-06-01",
        dateTo: "2026-06-07",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
    expect(mockedBuild).not.toHaveBeenCalled()
  })

  it("rejects invalid password", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedVerify.mockResolvedValue({ ok: false, code: "bad_credentials" })

    const req = new Request("http://localhost/api/pos/collect-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staffId: "001",
        password: "wrong",
        dateFrom: "2026-06-01",
        dateTo: "2026-06-07",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(mockedBuild).not.toHaveBeenCalled()
  })
})
