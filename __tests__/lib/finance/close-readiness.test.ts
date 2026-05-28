import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { getCloseReadinessByPeriodId } from "@/lib/finance/close-readiness"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { findSnapshotsForPeriod } from "@/lib/finance/reconciliation-snapshot"

jest.mock("@/lib/finance/reconciliation-snapshot", () => ({
  findSnapshotsForPeriod: jest.fn(),
}))

const mockFindSnapshotsForPeriod = findSnapshotsForPeriod as jest.MockedFunction<
  typeof findSnapshotsForPeriod
>

const openedAt = new Date("2026-05-01T00:00:00.000Z")

function buildPrisma(period: unknown) {
  return {
    accountingPeriod: {
      findUnique: jest.fn(async () => period),
      update: jest.fn(),
      create: jest.fn(),
    },
    reconciliationSnapshot: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    branch: { findFirst: jest.fn() },
  }
}

describe("getCloseReadinessByPeriodId", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("assembles readiness from period and frozen snapshots only", async () => {
    const prisma = buildPrisma({
      id: "period-1",
      branchId: "branch-1",
      periodKey: "2026-05",
      status: AccountingPeriodStatus.OPEN,
      openedAt,
      closedAt: null,
    })

    mockFindSnapshotsForPeriod.mockResolvedValue({
      latest: {
        id: "snap-1",
        kind: "MANUAL",
        branchId: "branch-1",
        fromDate: "2026-05-01",
        toDate: "2026-05-31",
        periodKey: "2026-05",
        label: null,
        checkedSales: 0,
        checkedStockDocuments: 0,
        issueCount: 0,
        dashboardRowCount: 2,
        matchedCount: 2,
        varianceCount: 0,
        totalVarianceAmount: "0.00",
        payloadVersion: 1,
        createdAt: "2026-05-27T12:00:00.000Z",
        createdByStaffId: "staff-1",
        note: null,
        payload: {
          inventoryResult: {
            filter: {},
            operationalTotalValue: "0",
            glInventoryBalance: "0",
            variances: [],
          },
          salesResult: {
            filter: {},
            operationalRevenue: "0",
            glRevenueBalance: "0",
            paymentBreakdown: [],
            variances: [],
          },
          dashboardRows: [
            {
              id: "inv",
              sourceType: "inventory",
              reference: "Inventory",
              branchId: "branch-1",
              periodLabel: "2026-05",
              expectedAmount: "0",
              actualAmount: "0",
              variance: "0",
              status: "MATCHED",
              domain: "inventory",
              raw: {
                domain: "inventory",
                label: "Inventory",
                operationalAmount: "0",
                glAmount: "0",
                variance: "0",
              },
            },
            {
              id: "rev",
              sourceType: "revenue",
              reference: "Revenue",
              branchId: "branch-1",
              periodLabel: "2026-05",
              expectedAmount: "0",
              actualAmount: "0",
              variance: "0",
              status: "MATCHED",
              domain: "revenue",
              raw: {
                domain: "revenue",
                label: "Revenue",
                operationalAmount: "0",
                glAmount: "0",
                variance: "0",
              },
            },
          ],
          issuesPayload: {
            filter: {},
            checkedSales: 0,
            checkedStockDocuments: 0,
            issueCount: 0,
            issues: [],
          },
        },
      },
      prior: {
        id: "snap-0",
        kind: "MANUAL",
        branchId: "branch-1",
        fromDate: "2026-05-01",
        toDate: "2026-05-31",
        periodKey: "2026-05",
        label: null,
        checkedSales: 0,
        checkedStockDocuments: 0,
        issueCount: 0,
        dashboardRowCount: 2,
        matchedCount: 2,
        varianceCount: 0,
        totalVarianceAmount: "0.00",
        payloadVersion: 1,
        createdAt: "2026-05-20T12:00:00.000Z",
        createdByStaffId: "staff-1",
      },
    })

    const readiness = await getCloseReadinessByPeriodId(prisma, "period-1")

    expect(readiness.period.id).toBe("period-1")
    expect(readiness.latestSnapshotRef?.id).toBe("snap-1")
    expect(readiness.priorSnapshotRef?.id).toBe("snap-0")
    expect(readiness.items.length).toBeGreaterThan(0)
    expect(prisma.accountingPeriod.update).not.toHaveBeenCalled()
    expect(prisma.reconciliationSnapshot.create).not.toHaveBeenCalled()
    expect(mockFindSnapshotsForPeriod).toHaveBeenCalledWith(prisma, {
      branchId: "branch-1",
      periodKey: "2026-05",
    })
  })

  it("throws PERIOD_NOT_FOUND when period id is missing", async () => {
    const prisma = buildPrisma(null)

    await expect(getCloseReadinessByPeriodId(prisma, "missing")).rejects.toMatchObject({
      code: "PERIOD_NOT_FOUND",
    } satisfies Partial<FinancePostingError>)
  })

  it("throws PERIOD_NOT_FOUND for blank id", async () => {
    const prisma = buildPrisma(null)

    await expect(getCloseReadinessByPeriodId(prisma, "   ")).rejects.toMatchObject({
      code: "PERIOD_NOT_FOUND",
    })
  })
})