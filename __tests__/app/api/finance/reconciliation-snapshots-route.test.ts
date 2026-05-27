import { NextRequest } from "next/server"
import { RECONCILIATION_SNAPSHOT_PAYLOAD_VERSION } from "@/lib/finance/reconciliation-snapshot-types"
import { ReconciliationSnapshotError } from "@/lib/finance/reconciliation-snapshot-errors"
import {
  getSession,
  requirePeriodAdminActor,
  resolvePeriodAdminStaffId,
} from "@/lib/auth"
import {
  createManualSnapshot,
  listReconciliationSnapshots,
} from "@/lib/finance/reconciliation-snapshot"
import { GET, POST } from "@/app/api/finance/reconciliation/snapshots/route"
import { prisma } from "@/lib/shared/prisma"

jest.mock("@/lib/auth", () => ({
  ...jest.requireActual("@/lib/auth"),
  getSession: jest.fn(),
  requirePeriodAdminActor: jest.fn(),
  resolvePeriodAdminStaffId: jest.fn(),
}))

jest.mock("@/lib/finance/reconciliation-snapshot", () => ({
  createManualSnapshot: jest.fn(),
  listReconciliationSnapshots: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockRequirePeriodAdminActor = requirePeriodAdminActor as jest.MockedFunction<
  typeof requirePeriodAdminActor
>
const mockCreateManualSnapshot = createManualSnapshot as jest.MockedFunction<
  typeof createManualSnapshot
>
const mockListReconciliationSnapshots = listReconciliationSnapshots as jest.MockedFunction<
  typeof listReconciliationSnapshots
>
const mockResolvePeriodAdminStaffId =
  resolvePeriodAdminStaffId as jest.MockedFunction<typeof resolvePeriodAdminStaffId>

const authorizedSession = {
  sessionId: "sess-1",
  role: "HO_FINANCE" as const,
  staffId: "staff-1",
  name: "Finance User",
  branchId: "branch-1",
}

const snapshotHeader = {
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
}

const snapshotDetail = {
  ...snapshotHeader,
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

describe("GET finance/reconciliation/snapshots", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns snapshot headers only", async () => {
    mockListReconciliationSnapshots.mockResolvedValue([snapshotHeader])

    const req = new NextRequest(
      "http://localhost/api/finance/reconciliation/snapshots?branchId=branch-1&limit=10"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ snapshots: [snapshotHeader] })
    expect(mockListReconciliationSnapshots).toHaveBeenCalledWith(prisma, {
      branchId: "branch-1",
      limit: 10,
    })
  })

  it("returns 400 for invalid limit", async () => {
    const req = new NextRequest(
      "http://localhost/api/finance/reconciliation/snapshots?limit=abc"
    )
    const res = await GET(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "Invalid limit",
      code: "VALIDATION_ERROR",
    })
    expect(mockListReconciliationSnapshots).not.toHaveBeenCalled()
  })
})

describe("POST finance/reconciliation/snapshots", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue(authorizedSession)
    mockRequirePeriodAdminActor.mockReturnValue({
      staffId: "staff-1",
      role: "HO_FINANCE",
    })
    mockResolvePeriodAdminStaffId.mockResolvedValue("staff-cuid-1")
    mockCreateManualSnapshot.mockResolvedValue(snapshotDetail)
  })

  it("returns 201 with created snapshot", async () => {
    const req = new NextRequest(
      "http://localhost/api/finance/reconciliation/snapshots",
      {
        method: "POST",
        body: JSON.stringify({
          branchId: "branch-1",
          periodKey: "2026-05",
          label: "Month-end",
          note: "Manual capture",
        }),
      }
    )
    const res = await POST(req)

    expect(res.status).toBe(201)
    await expect(res.json()).resolves.toEqual({ snapshot: snapshotDetail })
    expect(mockRequirePeriodAdminActor).toHaveBeenCalledWith(authorizedSession)
    expect(mockResolvePeriodAdminStaffId).toHaveBeenCalledWith(prisma, "staff-1", {
      branchIdHint: "branch-1",
    })
    expect(mockCreateManualSnapshot).toHaveBeenCalledWith(prisma, {
      branchId: "branch-1",
      fromDate: undefined,
      toDate: undefined,
      periodKey: "2026-05",
      label: "Month-end",
      note: "Manual capture",
      createdByStaffId: "staff-cuid-1",
    })
  })

  it("returns 401 when session is missing", async () => {
    const authError = new (jest.requireActual("@/lib/auth")
      .PeriodAdminAuthError)("Authentication required", "UNAUTHENTICATED", 401)
    mockRequirePeriodAdminActor.mockImplementation(() => {
      throw authError
    })

    const req = new NextRequest(
      "http://localhost/api/finance/reconciliation/snapshots",
      {
        method: "POST",
        body: JSON.stringify({ periodKey: "2026-05" }),
      }
    )
    const res = await POST(req)

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({
      error: "Authentication required",
      code: "UNAUTHENTICATED",
    })
    expect(mockCreateManualSnapshot).not.toHaveBeenCalled()
  })

  it("returns 403 when actor is not period admin", async () => {
    const authError = new (jest.requireActual("@/lib/auth")
      .PeriodAdminAuthError)(
      "Insufficient permissions for period admin",
      "FORBIDDEN",
      403
    )
    mockRequirePeriodAdminActor.mockImplementation(() => {
      throw authError
    })

    const req = new NextRequest(
      "http://localhost/api/finance/reconciliation/snapshots",
      {
        method: "POST",
        body: JSON.stringify({ periodKey: "2026-05" }),
      }
    )
    const res = await POST(req)

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({
      error: "Insufficient permissions for period admin",
      code: "FORBIDDEN",
    })
    expect(mockCreateManualSnapshot).not.toHaveBeenCalled()
  })

  it("maps INVALID_SCOPE from createManualSnapshot to 400", async () => {
    mockCreateManualSnapshot.mockRejectedValue(
      new ReconciliationSnapshotError(
        "fromDate and toDate are required when periodKey is omitted",
        "INVALID_SCOPE"
      )
    )

    const req = new NextRequest(
      "http://localhost/api/finance/reconciliation/snapshots",
      {
        method: "POST",
        body: JSON.stringify({ branchId: "branch-1" }),
      }
    )
    const res = await POST(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "fromDate and toDate are required when periodKey is omitted",
      code: "INVALID_SCOPE",
    })
  })
})

describe("finance/reconciliation/snapshots route exports", () => {
  it("has no mutation handlers other than POST", () => {
    const route = require("@/app/api/finance/reconciliation/snapshots/route") as Record<
      string,
      unknown
    >
    expect(route.GET).toBeDefined()
    expect(route.POST).toBeDefined()
    expect(route.PATCH).toBeUndefined()
    expect(route.PUT).toBeUndefined()
    expect(route.DELETE).toBeUndefined()
  })
})
