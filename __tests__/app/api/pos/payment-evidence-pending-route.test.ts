import { GET } from "@/app/api/pos/payment-evidence/pending/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/list-pending-payment-evidence", () => ({
  listPendingPaymentEvidence: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { listPendingPaymentEvidence } from "@/lib/pos/list-pending-payment-evidence"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedList = listPendingPaymentEvidence as jest.MockedFunction<
  typeof listPendingPaymentEvidence
>

const shopSession = {
  sessionId: "s1",
  userId: "u1",
  role: "SH_STAFF" as const,
  staffId: "staff-1",
  name: "Shop",
  branchId: "branch-shop",
  branchCode: "SH001",
  branchName: "Shop Branch",
}

describe("GET /api/pos/payment-evidence/pending", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns pending evidence for authenticated shop session", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedList.mockResolvedValue({
      count: 1,
      receipts: [
        {
          evidenceId: "ev-1",
          saleId: "sale-1",
          receiptNo: "REC-SH001-202606-0001",
          issuedAt: "2026-06-05T03:00:00.000Z",
          total: "250.00",
          staff: "101-Ann",
        },
      ],
    })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(1)
    expect(mockedList).toHaveBeenCalledWith(expect.anything(), {
      branchId: "branch-shop",
    })
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })
})
