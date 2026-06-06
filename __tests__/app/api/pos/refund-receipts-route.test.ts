import { NextRequest } from "next/server"
import { GET } from "@/app/api/pos/refund/receipts/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/search-refundable-receipts", () => ({
  searchRefundableReceipts: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { searchRefundableReceipts } from "@/lib/pos/search-refundable-receipts"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedSearch = searchRefundableReceipts as jest.MockedFunction<
  typeof searchRefundableReceipts
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

describe("GET /api/pos/refund/receipts", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue(shopSession)
  })

  it("returns branch-scoped refundable receipts", async () => {
    mockedSearch.mockResolvedValue([
      {
        receiptNo: "REC-SH001-202606-0001",
        saleId: "sale-1",
        issuedAt: "2026-06-06T10:00:00.000Z",
        total: "250.00",
        alreadyRefunded: "0.00",
        remaining: "250.00",
        cashierDisplay: "103-Somsak",
      },
    ])

    const res = await GET(new NextRequest("http://localhost/api/pos/refund/receipts"))

    expect(res.status).toBe(200)
    expect(mockedSearch).toHaveBeenCalledWith(expect.anything(), {
      branchId: "branch-shop",
      query: null,
    })
    await expect(res.json()).resolves.toEqual({
      receipts: [
        expect.objectContaining({
          receiptNo: "REC-SH001-202606-0001",
          remaining: "250.00",
        }),
      ],
    })
  })

  it("passes query filter to search helper", async () => {
    mockedSearch.mockResolvedValue([])

    await GET(
      new NextRequest("http://localhost/api/pos/refund/receipts?query=REC-0002")
    )

    expect(mockedSearch).toHaveBeenCalledWith(expect.anything(), {
      branchId: "branch-shop",
      query: "REC-0002",
    })
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)
    const res = await GET(new NextRequest("http://localhost/api/pos/refund/receipts"))
    expect(res.status).toBe(401)
    expect(mockedSearch).not.toHaveBeenCalled()
  })
})
