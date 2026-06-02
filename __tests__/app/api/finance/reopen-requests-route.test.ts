import { NextRequest } from "next/server"
import { ReopenRequestError } from "@/lib/finance/reopen-request-errors"
import { listReopenRequestsByPeriodId } from "@/lib/finance/reopen-request"
import { GET } from "@/app/api/finance/periods/[id]/reopen-requests/route"
import { prisma } from "@/lib/shared/prisma"

jest.mock("@/lib/finance/reopen-request", () => ({
  listReopenRequestsByPeriodId: jest.fn(),
  createReopenRequest: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    accountingPeriod: { findUnique: jest.fn() },
    accountingPeriodReopenRequest: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

const mockListReopenRequests = listReopenRequestsByPeriodId as jest.MockedFunction<
  typeof listReopenRequestsByPeriodId
>

const requests = [
  {
    id: "request-1",
    requestNo: "RRO-2026-05-0001",
    periodId: "period-1",
    branchId: "branch-1",
    periodKey: "2026-05",
    fromStatus: "HARD_CLOSED",
    toStatus: "SOFT_CLOSED",
    reason: "Need correction",
    status: "PENDING" as const,
    requestedAt: "2026-06-01T09:00:00.000Z",
    requestedByStaffId: "finance-1",
    requestedByName: "Finance User",
    requestedByRole: "HO_FINANCE",
    approvedAt: null,
    approvedByStaffId: null,
    approvedByName: null,
    approvedByRole: null,
    approvalNote: null,
    rejectedAt: null,
    rejectedByStaffId: null,
    rejectedByName: null,
    rejectedByRole: null,
    rejectionNote: null,
    cancelledAt: null,
    cancelledByStaffId: null,
    cancelledByName: null,
    cancelledByRole: null,
    executedAt: null,
    reopenEvidenceId: null,
    closeEvidenceId: "close-evidence-1",
    policyKey: "default",
    payloadVersion: 1,
    payload: { payloadVersion: 1 as const },
    createdAt: "2026-06-01T09:00:01.000Z",
  },
]

describe("GET finance/periods/[id]/reopen-requests", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns reopen requests for a period", async () => {
    mockListReopenRequests.mockResolvedValue(requests)

    const req = new NextRequest(
      "http://localhost/api/finance/periods/period-1/reopen-requests"
    )
    const res = await GET(req, { params: Promise.resolve({ id: "period-1" }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ requests })
    expect(mockListReopenRequests).toHaveBeenCalledWith(prisma, "period-1", {})
    expect(prisma.accountingPeriodReopenRequest.create).not.toHaveBeenCalled()
    expect(prisma.accountingPeriodReopenRequest.update).not.toHaveBeenCalled()
    expect(prisma.accountingPeriodReopenRequest.delete).not.toHaveBeenCalled()
  })

  it("passes status filter when query param is set", async () => {
    mockListReopenRequests.mockResolvedValue([requests[0]!])

    const req = new NextRequest(
      "http://localhost/api/finance/periods/period-1/reopen-requests?status=PENDING"
    )
    const res = await GET(req, { params: Promise.resolve({ id: "period-1" }) })

    expect(res.status).toBe(200)
    expect(mockListReopenRequests).toHaveBeenCalledWith(prisma, "period-1", {
      status: "PENDING",
    })
  })

  it("returns empty list when no requests exist", async () => {
    mockListReopenRequests.mockResolvedValue([])

    const req = new NextRequest(
      "http://localhost/api/finance/periods/period-1/reopen-requests"
    )
    const res = await GET(req, { params: Promise.resolve({ id: "period-1" }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ requests: [] })
  })

  it("returns 404 when period id is blank", async () => {
    mockListReopenRequests.mockRejectedValue(
      new ReopenRequestError(
        "Accounting period id is required",
        "REOPEN_REQUEST_NOT_FOUND"
      )
    )

    const req = new NextRequest(
      "http://localhost/api/finance/periods/ /reopen-requests"
    )
    const res = await GET(req, { params: Promise.resolve({ id: " " }) })

    expect(res.status).toBe(404)
    expect(prisma.accountingPeriodReopenRequest.create).not.toHaveBeenCalled()
  })
})
