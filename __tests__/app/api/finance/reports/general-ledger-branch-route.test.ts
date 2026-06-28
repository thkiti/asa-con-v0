import { NextRequest } from "next/server"
import { GET } from "@/app/api/finance/reports/general-ledger/route"
import { applyReportBranchScope } from "@/lib/finance/reports/report-branch-scope"
import { getGeneralLedger } from "@/lib/finance/reports/general-ledger"
import { resolveReportSessionLegalEntityCode } from "@/lib/finance/reports/report-session"

jest.mock("@/lib/finance/reports/report-session", () => ({
  resolveReportSessionLegalEntityCode: jest.fn().mockResolvedValue("AD"),
}))

jest.mock("@/lib/finance/reports/report-branch-scope", () => ({
  applyReportBranchScope: jest.fn(),
}))

jest.mock("@/lib/finance/reports/general-ledger", () => ({
  getGeneralLedger: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: { mocked: true },
}))

const mockApplyBranch = applyReportBranchScope as jest.Mock
const mockGetGeneralLedger = getGeneralLedger as jest.Mock

describe("GET /api/finance/reports/general-ledger branch scope", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockApplyBranch.mockImplementation(async (_prisma, filter) => ({
      ...filter,
      branchId: "branch-ho999-internal",
    }))
    mockGetGeneralLedger.mockResolvedValue({ filter: {}, accounts: [] })
  })

  it("resolves branch code before querying general ledger", async () => {
    const req = new NextRequest(
      "http://localhost/api/finance/reports/general-ledger?branchId=HO999&periodKey=2026-01&accountCode=1"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(mockApplyBranch).toHaveBeenCalledWith(
      expect.objectContaining({ mocked: true }),
      expect.objectContaining({
        legalEntityCode: "AD",
        branchId: "HO999",
        periodKey: "2026-01",
        accountCode: "1",
      })
    )
    expect(mockGetGeneralLedger).toHaveBeenCalledWith(
      expect.objectContaining({ mocked: true }),
      expect.objectContaining({
        legalEntityCode: "AD",
        branchId: "branch-ho999-internal",
        periodKey: "2026-01",
        accountCode: "1",
      })
    )
    expect(resolveReportSessionLegalEntityCode).toHaveBeenCalled()
  })

  it("queries entity-wide when branchId is omitted", async () => {
    mockApplyBranch.mockImplementation(async (_prisma, filter) => filter)

    const req = new NextRequest(
      "http://localhost/api/finance/reports/general-ledger?periodKey=2026-01&accountCode=1"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(mockApplyBranch).toHaveBeenCalledWith(
      expect.objectContaining({ mocked: true }),
      expect.objectContaining({
        legalEntityCode: "AD",
        periodKey: "2026-01",
        accountCode: "1",
      })
    )
    expect(mockGetGeneralLedger).toHaveBeenCalledWith(
      expect.objectContaining({ mocked: true }),
      expect.objectContaining({
        legalEntityCode: "AD",
        periodKey: "2026-01",
        accountCode: "1",
      })
    )
    expect(mockGetGeneralLedger).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.objectContaining({ branchId: expect.anything() })
    )
  })
})
