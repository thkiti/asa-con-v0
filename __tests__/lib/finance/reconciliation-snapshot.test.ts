import {
  createManualSnapshot,
  getReconciliationSnapshotById,
  listReconciliationSnapshots,
} from "@/lib/finance/reconciliation-snapshot"
import { ReconciliationSnapshotError } from "@/lib/finance/reconciliation-snapshot-errors"
import { RECONCILIATION_SNAPSHOT_PAYLOAD_VERSION } from "@/lib/finance/reconciliation-snapshot-types"

const mockPayload = {
  inventoryResult: {
    filter: {},
    operationalTotalValue: "100",
    glInventoryBalance: "100",
    variances: [],
  },
  salesResult: {
    filter: {},
    operationalRevenue: "500",
    glRevenueBalance: "500",
    paymentBreakdown: [],
    variances: [],
  },
  dashboardRows: [],
  issuesPayload: {
    filter: { from: "2026-05-01", to: "2026-05-31" },
    checkedSales: 1,
    checkedStockDocuments: 0,
    issueCount: 0,
    issues: [],
  },
}

jest.mock("@/lib/finance/reconciliation-snapshot-capture", () => ({
  captureReconciliationSnapshotPayload: jest.fn(async () => mockPayload),
}))

function branchFindFirst(args: { where: { OR: Array<{ id?: string; code?: string }> } }) {
  const key = args.where.OR[0]?.id ?? args.where.OR[0]?.code ?? ""
  if (key === "SH001") return { id: "uuid-sh001" }
  if (key === "branch-1") return { id: "branch-1" }
  return null
}

function buildStoredRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "snap-1",
    kind: "MANUAL" as const,
    branchId: "branch-1",
    fromDate: new Date("2026-05-01T00:00:00.000Z"),
    toDate: new Date("2026-05-31T00:00:00.000Z"),
    periodKey: "2026-05",
    label: "Month-end",
    note: null,
    checkedSales: 1,
    checkedStockDocuments: 0,
    issueCount: 0,
    dashboardRowCount: 0,
    matchedCount: 0,
    varianceCount: 0,
    totalVarianceAmount: { toString: () => "0.00" },
    payloadVersion: RECONCILIATION_SNAPSHOT_PAYLOAD_VERSION,
    inventoryResult: mockPayload.inventoryResult,
    salesResult: mockPayload.salesResult,
    dashboardRows: mockPayload.dashboardRows,
    issuesPayload: mockPayload.issuesPayload,
    createdAt: new Date("2026-05-27T12:00:00.000Z"),
    createdByStaffId: "staff-1",
    ...overrides,
  }
}

describe("createManualSnapshot", () => {
  it("writes only reconciliationSnapshot.create", async () => {
    const stored = buildStoredRow()
    const create = jest.fn(async () => stored)
    const prisma = {
      reconciliationSnapshot: { create, findMany: jest.fn(), findUnique: jest.fn() },
      branch: { findFirst: jest.fn(branchFindFirst) },
      $transaction: jest.fn(),
    }

    const result = await createManualSnapshot(prisma as never, {
      periodKey: "2026-05",
      branchId: "branch-1",
      createdByStaffId: "staff-1",
    })

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ branchId: "branch-1" }),
      })
    )
    expect(create).toHaveBeenCalledTimes(1)
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(result.id).toBe("snap-1")
    expect(result.payload.issuesPayload.checkedSales).toBe(1)
  })


  it("resolves branch code to Branch.id before create", async () => {
    const stored = buildStoredRow({ branchId: "uuid-sh001" })
    const create = jest.fn(async () => stored)
    const prisma = {
      reconciliationSnapshot: { create, findMany: jest.fn(), findUnique: jest.fn() },
      branch: { findFirst: jest.fn(branchFindFirst) },
      $transaction: jest.fn(),
    }

    await createManualSnapshot(prisma as never, {
      periodKey: "2026-05",
      branchId: "SH001",
      createdByStaffId: "staff-1",
    })

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ branchId: "uuid-sh001" }),
      })
    )
  })

  it("throws INVALID_SCOPE for invalid input", async () => {
    const prisma = {
      reconciliationSnapshot: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    }

    await expect(
      createManualSnapshot(prisma as never, {
        createdByStaffId: "staff-1",
      })
    ).rejects.toMatchObject({
      code: "INVALID_SCOPE",
    })
  })
})

describe("listReconciliationSnapshots", () => {
  it("returns headers with default limit", async () => {
    const stored = buildStoredRow()
    const findMany = jest.fn(async () => [stored])
    const prisma = {
      reconciliationSnapshot: { findMany, create: jest.fn(), findUnique: jest.fn() },
      branch: { findFirst: jest.fn(branchFindFirst) },
    }

    const rows = await listReconciliationSnapshots(prisma as never, {
      branchId: "branch-1",
    })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { branchId: "branch-1" },
        take: 50,
      })
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.id).toBe("snap-1")
    expect(rows[0]?.fromDate).toBe("2026-05-01")
  })

  it("caps limit at 100", async () => {
    const findMany = jest.fn(async () => [])
    const prisma = {
      reconciliationSnapshot: { findMany, create: jest.fn(), findUnique: jest.fn() },
      branch: { findFirst: jest.fn() },
    }

    await listReconciliationSnapshots(prisma as never, { limit: 500 })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    )
  })
})

describe("getReconciliationSnapshotById", () => {
  it("returns detail when found", async () => {
    const stored = buildStoredRow()
    const findUnique = jest.fn(async () => stored)
    const prisma = {
      reconciliationSnapshot: { findUnique, create: jest.fn(), findMany: jest.fn() },
    }

    const detail = await getReconciliationSnapshotById(prisma as never, "snap-1")

    expect(detail.id).toBe("snap-1")
    expect(detail.payload.dashboardRows).toEqual([])
  })

  it("throws NOT_FOUND when missing", async () => {
    const findUnique = jest.fn(async () => null)
    const prisma = {
      reconciliationSnapshot: { findUnique, create: jest.fn(), findMany: jest.fn() },
    }

    await expect(
      getReconciliationSnapshotById(prisma as never, "missing")
    ).rejects.toBeInstanceOf(ReconciliationSnapshotError)

    await expect(
      getReconciliationSnapshotById(prisma as never, "missing")
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
