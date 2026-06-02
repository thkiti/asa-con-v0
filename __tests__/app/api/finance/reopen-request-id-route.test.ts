import { NextRequest } from "next/server"
import { ReopenRequestError } from "@/lib/finance/reopen-request-errors"
import { getReopenRequestById } from "@/lib/finance/reopen-request"
import { GET } from "@/app/api/finance/periods/[id]/reopen-requests/[requestId]/route"
import { prisma } from "@/lib/shared/prisma"

jest.mock("@/lib/finance/reopen-request", () => ({
  getReopenRequestById: jest.fn(),
  approveReopenRequest: jest.fn(),
  rejectReopenRequest: jest.fn(),
  cancelReopenRequest: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    accountingPeriodReopenRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

const mockGetReopenRequest = getReopenRequestById as jest.MockedFunction<
  typeof getReopenRequestById
>

const request = {
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
}

describe("GET finance/periods/[id]/reopen-requests/[requestId]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns one reopen request by id", async () => {
    mockGetReopenRequest.mockResolvedValue(request)

    const req = new NextRequest(
      "http://localhost/api/finance/periods/period-1/reopen-requests/request-1"
    )
    const res = await GET(req, {
      params: Promise.resolve({ id: "period-1", requestId: "request-1" }),
    })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ request })
    expect(mockGetReopenRequest).toHaveBeenCalledWith(prisma, "request-1")
    expect(prisma.accountingPeriodReopenRequest.update).not.toHaveBeenCalled()
    expect(prisma.accountingPeriodReopenRequest.create).not.toHaveBeenCalled()
    expect(prisma.accountingPeriodReopenRequest.delete).not.toHaveBeenCalled()
  })

  it("returns 404 when request is missing", async () => {
    mockGetReopenRequest.mockRejectedValue(
      new ReopenRequestError("Reopen request not found: missing", "REOPEN_REQUEST_NOT_FOUND")
    )

    const req = new NextRequest(
      "http://localhost/api/finance/periods/period-1/reopen-requests/missing"
    )
    const res = await GET(req, {
      params: Promise.resolve({ id: "period-1", requestId: "missing" }),
    })

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({
      code: "REOPEN_REQUEST_NOT_FOUND",
    })
    expect(prisma.accountingPeriodReopenRequest.update).not.toHaveBeenCalled()
  })
})
