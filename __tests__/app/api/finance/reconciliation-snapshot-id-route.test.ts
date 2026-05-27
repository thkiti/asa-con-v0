import { NextRequest } from "next/server"
import { RECONCILIATION_SNAPSHOT_PAYLOAD_VERSION } from "@/lib/finance/reconciliation-snapshot-types"
import { ReconciliationSnapshotError } from "@/lib/finance/reconciliation-snapshot-errors"
import { getReconciliationSnapshotById } from "@/lib/finance/reconciliation-snapshot"
import { GET } from "@/app/api/finance/reconciliation/snapshots/[id]/route"
import { prisma } from "@/lib/shared/prisma"

jest.mock("@/lib/finance/reconciliation-snapshot", () => ({
  getReconciliationSnapshotById: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: { mocked: true },
}))

const mockGetReconciliationSnapshotById =
  getReconciliationSnapshotById as jest.MockedFunction<
    typeof getReconciliationSnapshotById
  >

const snapshotDetail = {
  id: "snap-1",
  kind: "MANUAL" as const,
  branchId: "branch-1",
  fromDate: "2026-05-01",
  toDate: "2026-05-31",
  periodKey: "2026-05",
  label: "Month-end",
  checkedSales: 1,
  checkedStockDocuments: 0,
  issueCount: 0,
  dashboardRowCount: 0,
  matchedCount: 0,
  varianceCount: 0,
  totalVarianceAmount: "0.00",
  payloadVersion: RECONCILIATION_SNAPSHOT_PAYLOAD_VERSION,
  createdAt: "2026-05-27T12:00:00.000Z",
  createdByStaffId: "staff-cuid-1",
  note: "Manual capture",
  payload: {
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
  },
}

describe("GET finance/reconciliation/snapshots/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns snapshot detail with payload", async () => {
    mockGetReconciliationSnapshotById.mockResolvedValue(snapshotDetail)

    const req = new NextRequest(
      "http://localhost/api/finance/reconciliation/snapshots/snap-1"
    )
    const res = await GET(req, { params: Promise.resolve({ id: "snap-1" }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ snapshot: snapshotDetail })
    expect(mockGetReconciliationSnapshotById).toHaveBeenCalledWith(
      expect.objectContaining({ mocked: true }),
      "snap-1"
    )
  })

  it("returns 404 when snapshot is missing", async () => {
    mockGetReconciliationSnapshotById.mockRejectedValue(
      new ReconciliationSnapshotError(
        "Reconciliation snapshot not found: missing",
        "NOT_FOUND"
      )
    )

    const req = new NextRequest(
      "http://localhost/api/finance/reconciliation/snapshots/missing"
    )
    const res = await GET(req, { params: Promise.resolve({ id: "missing" }) })

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({
      error: "Reconciliation snapshot not found: missing",
      code: "NOT_FOUND",
    })
  })

  it("has no mutation handlers", () => {
    const route = require("@/app/api/finance/reconciliation/snapshots/[id]/route") as Record<
      string,
      unknown
    >
    expect(route.POST).toBeUndefined()
    expect(route.PATCH).toBeUndefined()
    expect(route.PUT).toBeUndefined()
    expect(route.DELETE).toBeUndefined()
  })
})
