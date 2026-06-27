import { POST } from "@/app/api/pos/verify-pos-staff/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/verifyPosReportStaffCredentials", () => ({
  verifyPosReportStaffCredentials: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { verifyPosReportStaffCredentials } from "@/lib/pos/verifyPosReportStaffCredentials"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
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

describe("POST /api/pos/verify-pos-staff COLLECT", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("allows COLLECT verify from shop POS session for HO credentials", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedVerify.mockResolvedValue({
      ok: true,
      staff: { staffId: "001", name: "HO Collector", id: "st-ho" },
    })

    const req = new Request("http://localhost/api/pos/verify-pos-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "COLLECT",
        staffId: "001",
        password: "secret",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.staffId).toBe("001")
    expect(body.staffName).toBe("HO Collector")
    expect(mockedVerify).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ intent: "COLLECT", staffCode: "001" })
    )
  })

  it("rejects shop staff credentials for COLLECT intent", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedVerify.mockResolvedValue({ ok: false, code: "no_collect_permission" })

    const req = new Request("http://localhost/api/pos/verify-pos-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "COLLECT",
        staffId: "103",
        password: "secret",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
  })
})
