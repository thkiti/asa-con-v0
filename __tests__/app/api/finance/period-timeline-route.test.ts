import { NextRequest } from "next/server"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { getPeriodAuditTimelineByPeriodId } from "@/lib/finance/period-audit-timeline"
import { GET } from "@/app/api/finance/periods/[id]/timeline/route"
import { prisma } from "@/lib/shared/prisma"

jest.mock("@/lib/finance/period-audit-timeline", () => ({
  getPeriodAuditTimelineByPeriodId: jest.fn(),
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

const mockGetTimeline = getPeriodAuditTimelineByPeriodId as jest.MockedFunction<
  typeof getPeriodAuditTimelineByPeriodId
>

const payload = {
  period: {
    id: "period-1",
    periodKey: "2026-05",
    branchId: "branch-1",
    status: "HARD_CLOSED",
    openedAt: "2026-05-01T00:00:00.000Z",
    closedAt: "2026-05-30T10:00:00.000Z",
  },
  timeline: [
    {
      id: "period-opened:period-1",
      type: "period_opened",
      occurredAt: "2026-05-01T00:00:00.000Z",
      actorId: null,
      actorName: null,
      title: "Period opened",
      description: "Accounting period 2026-05 opened for posting.",
      source: "period",
      sourceId: "period-1",
      metadata: { periodKey: "2026-05", branchId: "branch-1", status: "HARD_CLOSED" },
    },
  ],
}

describe("GET finance/periods/[id]/timeline", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns timeline payload when period exists", async () => {
    mockGetTimeline.mockResolvedValue(payload)

    const req = new NextRequest("http://localhost/api/finance/periods/period-1/timeline")
    const res = await GET(req, { params: Promise.resolve({ id: "period-1" }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual(payload)
    expect(mockGetTimeline).toHaveBeenCalledWith(prisma, "period-1")
    expect(prisma.accountingPeriod.create).not.toHaveBeenCalled()
    expect(prisma.accountingPeriod.update).not.toHaveBeenCalled()
    expect(prisma.accountingPeriodCloseEvidence.create).not.toHaveBeenCalled()
  })

  it("returns 404 PERIOD_NOT_FOUND when period is missing", async () => {
    mockGetTimeline.mockRejectedValue(
      new FinancePostingError("Accounting period not found: missing", "PERIOD_NOT_FOUND")
    )

    const req = new NextRequest("http://localhost/api/finance/periods/missing/timeline")
    const res = await GET(req, { params: Promise.resolve({ id: "missing" }) })

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({
      error: "Accounting period not found: missing",
      code: "PERIOD_NOT_FOUND",
    })
    expect(prisma.accountingPeriod.create).not.toHaveBeenCalled()
    expect(prisma.accountingPeriod.update).not.toHaveBeenCalled()
  })
})
