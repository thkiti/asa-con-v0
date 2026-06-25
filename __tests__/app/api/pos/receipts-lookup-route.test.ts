import { NextRequest } from "next/server"
import { GET } from "@/app/api/pos/receipts/lookup/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/receipt-lookup", () => ({
  searchReceiptLookup: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { searchReceiptLookup } from "@/lib/pos/receipt-lookup"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedSearch = searchReceiptLookup as jest.MockedFunction<
  typeof searchReceiptLookup
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
  documentEntityCode: "ASAS" as const,
}

describe("GET /api/pos/receipts/lookup", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue(shopSession)
  })

  it("returns branch-scoped lookup results", async () => {
    mockedSearch.mockResolvedValue({
      receipts: [
        {
          receiptId: "receipt-1",
          receiptNo: "REC-SH001-202606-0001",
          issuedAt: "2026-06-06T10:00:00.000Z",
          branchCode: "SH001",
          branchName: "Shop Branch",
          staffDisplay: "103-Somsak",
          total: "250.00",
          paymentMethodLabel: "CASH",
          archiveStatus: "ready",
          archiveStatusLabel: "Ready",
          pdfUrl: "/api/pos/receipts/receipt-1/pdf?disposition=inline",
        },
      ],
    })

    const res = await GET(
      new NextRequest(
        "http://localhost/api/pos/receipts/lookup?receiptNo=0001&dateFrom=2026-06-01&dateTo=2026-06-30"
      )
    )

    expect(res.status).toBe(200)
    expect(mockedSearch).toHaveBeenCalledWith(expect.anything(), {
      branchId: "branch-shop",
      receiptNo: "0001",
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
      limit: undefined,
    })
    await expect(res.json()).resolves.toEqual({
      receipts: [expect.objectContaining({ receiptNo: "REC-SH001-202606-0001" })],
    })
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)
    const res = await GET(new NextRequest("http://localhost/api/pos/receipts/lookup"))
    expect(res.status).toBe(401)
    expect(mockedSearch).not.toHaveBeenCalled()
  })
})
