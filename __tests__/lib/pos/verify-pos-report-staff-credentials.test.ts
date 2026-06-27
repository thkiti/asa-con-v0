import { verifyPosReportStaffCredentials } from "@/lib/pos/verifyPosReportStaffCredentials"

const prisma = {
  staff: {
    findFirst: jest.fn(),
  },
} as unknown as Parameters<typeof verifyPosReportStaffCredentials>[0]

jest.mock("@/lib/auth/verify-staff-password", () => ({
  verifyStaffPassword: jest.fn(async () => true),
}))

jest.mock("@/lib/pos/resolvePosReportStaff", () => ({
  resolveStaffForPosReadReport: jest.fn(),
}))

import { resolveStaffForPosReadReport } from "@/lib/pos/resolvePosReportStaff"

const mockedResolve = resolveStaffForPosReadReport as jest.MockedFunction<
  typeof resolveStaffForPosReadReport
>

describe("verifyPosReportStaffCredentials COLLECT", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("allows HO staff for COLLECT intent", async () => {
    mockedResolve.mockResolvedValue({
      id: "s1",
      staffId: "001",
      name: "HO User",
      password: "hash",
      role: "HO_ADMIN",
      posCanCollect: false,
    } as never)

    const result = await verifyPosReportStaffCredentials(prisma, {
      staffCode: "001",
      password: "pw",
      intent: "COLLECT",
    })

    expect(result.ok).toBe(true)
  })

  it("rejects SH staff for COLLECT intent regardless of posCanCollect", async () => {
    mockedResolve.mockResolvedValue({
      id: "s2",
      staffId: "103",
      name: "Shop User",
      password: "hash",
      role: "SH_STAFF",
      posCanCollect: true,
    } as never)

    const result = await verifyPosReportStaffCredentials(prisma, {
      staffCode: "103",
      password: "pw",
      intent: "COLLECT",
    })

    expect(result).toEqual({ ok: false, code: "no_collect_permission" })
  })

  it("allows SH staff for READ_Z_REVIEW intent", async () => {
    mockedResolve.mockResolvedValue({
      id: "s2",
      staffId: "103",
      name: "Shop User",
      password: "hash",
      role: "SH_STAFF",
      posCanCollect: false,
    } as never)

    const result = await verifyPosReportStaffCredentials(prisma, {
      staffCode: "103",
      password: "pw",
      intent: "READ_Z_REVIEW",
    })

    expect(result).toEqual({
      ok: true,
      staff: { staffId: "103", name: "Shop User", id: "s2" },
    })
  })
})
