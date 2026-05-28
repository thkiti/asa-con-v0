import { NextRequest } from "next/server"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { getCloseReadinessByPeriodId } from "@/lib/finance/close-readiness"
import { GET } from "@/app/api/finance/periods/[id]/close-readiness/route"
import { prisma } from "@/lib/shared/prisma"

jest.mock("@/lib/finance/close-readiness", () => ({
  getCloseReadinessByPeriodId: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: { mocked: true },
}))

const mockGetCloseReadiness = getCloseReadinessByPeriodId as jest.MockedFunction<
  typeof getCloseReadinessByPeriodId
>

const readiness = {
  status: "WARNING" as const,
  blockerCount: 0,
  warningCount: 1,
  items: [],
  latestSnapshotRef: {
    id: "snap-1",
    createdAt: "2026-05-27T12:00:00.000Z",
    periodKey: "2026-05",
    branchId: "branch-1",
    label: null,
  },
  priorSnapshotRef: null,
  metrics: {
    issueCount: 0,
    varianceCount: 0,
    matchedCount: 2,
    dashboardRowCount: 2,
    totalVarianceAmount: "0.00",
    missingGlIssueCount: 0,
    missingSourceIssueCount: 0,
    inventoryDomainPresent: true,
    revenueDomainPresent: true,
    snapshotAgeDays: 1,
    compareDriftDetected: false,
  },
  period: {
    id: "period-1",
    branchId: "branch-1",
    periodKey: "2026-05",
    status: "OPEN" as const,
    closedAt: null,
  },
}

describe("GET finance/periods/[id]/close-readiness", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns readiness payload", async () => {
    mockGetCloseReadiness.mockResolvedValue(readiness)

    const req = new NextRequest(
      "http://localhost/api/finance/periods/period-1/close-readiness"
    )
    const res = await GET(req, { params: Promise.resolve({ id: "period-1" }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ readiness })
    expect(mockGetCloseReadiness).toHaveBeenCalledWith(prisma, "period-1")
  })

  it("returns 404 when period is missing", async () => {
    mockGetCloseReadiness.mockRejectedValue(
      new FinancePostingError("Accounting period not found: missing", "PERIOD_NOT_FOUND")
    )

    const req = new NextRequest(
      "http://localhost/api/finance/periods/missing/close-readiness"
    )
    const res = await GET(req, { params: Promise.resolve({ id: "missing" }) })

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({
      error: "Accounting period not found: missing",
      code: "PERIOD_NOT_FOUND",
    })
  })
})