import { NextRequest } from "next/server"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { getCloseEvidenceByPeriodId } from "@/lib/finance/close-evidence"
import { GET } from "@/app/api/finance/periods/[id]/close-evidence/route"
import { prisma } from "@/lib/shared/prisma"

jest.mock("@/lib/finance/close-evidence", () => ({
  getCloseEvidenceByPeriodId: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    accountingPeriodCloseEvidence: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

const mockGetCloseEvidence = getCloseEvidenceByPeriodId as jest.MockedFunction<
  typeof getCloseEvidenceByPeriodId
>

const evidence = {
  id: "evidence-1",
  periodId: "period-1",
  branchId: "branch-1",
  periodKey: "2026-05",
  closeMode: "HARD",
  closedAt: "2026-05-30T10:00:00.000Z",
  closedByStaffId: "staff-db-1",
  closedByName: "Finance Admin",
  closedByRole: "HO_FINANCE",
  readinessStatus: "WARNING" as const,
  gatePolicyKey: "default",
  reconciliationSnapshotId: "snap-1",
  priorSnapshotId: null,
  payloadVersion: 1,
  payload: {
    payloadVersion: 1 as const,
    period: {
      id: "period-1",
      branchId: "branch-1",
      periodKey: "2026-05",
      statusBefore: "OPEN",
      statusAfter: "HARD_CLOSED",
      openedAt: "2026-05-01T00:00:00.000Z",
      closedAt: "2026-05-30T10:00:00.000Z",
    },
    close: {
      mode: "HARD" as const,
      closedAt: "2026-05-30T10:00:00.000Z",
      closedByStaffId: "staff-db-1",
      closedByName: "Finance Admin",
      closedByRole: "HO_FINANCE" as const,
    },
    gate: {
      policyKey: "default",
      rejectBlocked: true,
      rejectWarnings: false,
    },
    checklist: {
      status: "WARNING" as const,
      blockerCount: 0,
      warningCount: 1,
      items: [],
    },
    reconciliationSummary: {
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
    financialTotals: {
      operationalInventoryValue: null,
      glInventoryBalance: null,
      operationalRevenue: null,
      glRevenueBalance: null,
    },
    traceabilityRefs: {
      reconciliationSnapshotId: "snap-1",
      priorSnapshotId: null,
      latestSnapshotRef: null,
      priorSnapshotRef: null,
      compareDriftDetected: false,
      issueSummary: {
        totalCount: 0,
        missingGlCount: 0,
        missingSourceCount: 0,
        varianceStatusCount: 0,
        errorSeverityCount: 0,
      },
    },
  },
  createdAt: "2026-05-30T10:00:01.000Z",
}

describe("GET finance/periods/[id]/close-evidence", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns evidence payload when close evidence exists", async () => {
    mockGetCloseEvidence.mockResolvedValue(evidence)

    const req = new NextRequest(
      "http://localhost/api/finance/periods/period-1/close-evidence"
    )
    const res = await GET(req, { params: Promise.resolve({ id: "period-1" }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ evidence })
    expect(mockGetCloseEvidence).toHaveBeenCalledWith(prisma, "period-1")
    expect(mockGetCloseEvidence).toHaveBeenCalledTimes(1)
    expect(prisma.accountingPeriodCloseEvidence.create).not.toHaveBeenCalled()
    expect(prisma.accountingPeriodCloseEvidence.update).not.toHaveBeenCalled()
    expect(prisma.accountingPeriodCloseEvidence.delete).not.toHaveBeenCalled()
  })

  it("returns 404 CLOSE_EVIDENCE_NOT_FOUND when evidence is missing", async () => {
    mockGetCloseEvidence.mockRejectedValue(
      new FinancePostingError(
        "Close evidence not found for period: period-open",
        "CLOSE_EVIDENCE_NOT_FOUND"
      )
    )

    const req = new NextRequest(
      "http://localhost/api/finance/periods/period-open/close-evidence"
    )
    const res = await GET(req, { params: Promise.resolve({ id: "period-open" }) })

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({
      error: "Close evidence not found for period: period-open",
      code: "CLOSE_EVIDENCE_NOT_FOUND",
    })
    expect(prisma.accountingPeriodCloseEvidence.create).not.toHaveBeenCalled()
    expect(prisma.accountingPeriodCloseEvidence.update).not.toHaveBeenCalled()
    expect(prisma.accountingPeriodCloseEvidence.delete).not.toHaveBeenCalled()
  })

  it("does not read actor from query string", async () => {
    mockGetCloseEvidence.mockResolvedValue(evidence)

    const req = new NextRequest(
      "http://localhost/api/finance/periods/period-1/close-evidence?closedByStaffId=fake&closedByName=fake"
    )
    const res = await GET(req, { params: Promise.resolve({ id: "period-1" }) })

    expect(res.status).toBe(200)
    expect(mockGetCloseEvidence).toHaveBeenCalledWith(prisma, "period-1")
  })
})
