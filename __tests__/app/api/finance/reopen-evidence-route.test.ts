import { NextRequest } from "next/server"
import { listReopenEvidenceByPeriodId } from "@/lib/finance/reopen-evidence"
import { GET } from "@/app/api/finance/periods/[id]/reopen-evidence/route"
import { prisma } from "@/lib/shared/prisma"

jest.mock("@/lib/finance/reopen-evidence", () => ({
  listReopenEvidenceByPeriodId: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    accountingPeriodReopenEvidence: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

const mockListReopenEvidence = listReopenEvidenceByPeriodId as jest.MockedFunction<
  typeof listReopenEvidenceByPeriodId
>

const evidence = [
  {
    id: "reopen-evidence-1",
    periodId: "period-1",
    branchId: "branch-1",
    periodKey: "2026-05",
    fromStatus: "HARD_CLOSED",
    toStatus: "SOFT_CLOSED",
    reopenedAt: "2026-06-01T10:00:00.000Z",
    reopenedByStaffId: "admin-1",
    reopenedByName: "HO Admin",
    reopenedByRole: "HO_ADMIN",
    reason: "Correction",
    closeEvidenceId: "close-evidence-1",
    payloadVersion: 1,
    payload: { payloadVersion: 1 as const },
    createdAt: "2026-06-01T10:00:01.000Z",
  },
]

describe("GET finance/periods/[id]/reopen-evidence", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns reopen evidence list when records exist", async () => {
    mockListReopenEvidence.mockResolvedValue(evidence)

    const req = new NextRequest(
      "http://localhost/api/finance/periods/period-1/reopen-evidence"
    )
    const res = await GET(req, { params: Promise.resolve({ id: "period-1" }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ evidence })
    expect(mockListReopenEvidence).toHaveBeenCalledWith(prisma, "period-1")
    expect(prisma.accountingPeriodReopenEvidence.create).not.toHaveBeenCalled()
    expect(prisma.accountingPeriodReopenEvidence.update).not.toHaveBeenCalled()
    expect(prisma.accountingPeriodReopenEvidence.delete).not.toHaveBeenCalled()
  })

  it("returns empty evidence list when no reopen records exist", async () => {
    mockListReopenEvidence.mockResolvedValue([])

    const req = new NextRequest(
      "http://localhost/api/finance/periods/period-open/reopen-evidence"
    )
    const res = await GET(req, { params: Promise.resolve({ id: "period-open" }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ evidence: [] })
    expect(mockListReopenEvidence).toHaveBeenCalledWith(prisma, "period-open")
  })
})
