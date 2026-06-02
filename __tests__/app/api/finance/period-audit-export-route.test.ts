import { NextRequest } from "next/server"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { getPeriodAuditExportByPeriodId } from "@/lib/finance/period-audit-export"
import { GET } from "@/app/api/finance/periods/[id]/audit-export/route"
import { prisma } from "@/lib/shared/prisma"

jest.mock("@/lib/finance/period-audit-export", () => ({
  getPeriodAuditExportByPeriodId: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    accountingPeriod: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    accountingPeriodCloseEvidence: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

const mockGetExport = getPeriodAuditExportByPeriodId as jest.MockedFunction<
  typeof getPeriodAuditExportByPeriodId
>

const exportBundle = {
  exportVersion: 1 as const,
  exportedAt: "2026-06-02T12:00:00.000Z",
  period: {
    id: "period-1",
    periodKey: "2026-05",
    branchId: "branch-1",
    status: "OPEN",
    openedAt: "2026-05-01T00:00:00.000Z",
    closedAt: null,
  },
  timeline: [],
  closeEvidence: [],
  reopenEvidence: [],
  reopenRequests: [],
  counts: {
    timelineEventCount: 0,
    closeEvidenceCount: 0,
    reopenEvidenceCount: 0,
    reopenRequestCount: 0,
  },
}

describe("GET finance/periods/[id]/audit-export", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns export bundle when period exists", async () => {
    mockGetExport.mockResolvedValue(exportBundle)

    const req = new NextRequest("http://localhost/api/finance/periods/period-1/audit-export")
    const res = await GET(req, { params: Promise.resolve({ id: "period-1" }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ export: exportBundle })
    expect(mockGetExport).toHaveBeenCalledWith(prisma, "period-1")
    expect(prisma.accountingPeriod.create).not.toHaveBeenCalled()
    expect(prisma.accountingPeriod.update).not.toHaveBeenCalled()
    expect(prisma.accountingPeriodCloseEvidence.create).not.toHaveBeenCalled()
  })

  it("returns 404 PERIOD_NOT_FOUND when period is missing", async () => {
    mockGetExport.mockRejectedValue(
      new FinancePostingError("Accounting period not found: missing", "PERIOD_NOT_FOUND")
    )

    const req = new NextRequest("http://localhost/api/finance/periods/missing/audit-export")
    const res = await GET(req, { params: Promise.resolve({ id: "missing" }) })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.code).toBe("PERIOD_NOT_FOUND")
  })
})
