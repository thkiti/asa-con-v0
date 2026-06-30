import { NextRequest } from "next/server"
import { GET } from "@/app/api/pos/refunds/lookup/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/refund-lookup", () => ({
  searchRefundLookup: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { searchRefundLookup } from "@/lib/pos/refund-lookup"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedSearch = searchRefundLookup as jest.MockedFunction<typeof searchRefundLookup>

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

describe("GET /api/pos/refunds/lookup", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue(shopSession)
  })

  it("returns branch-scoped refund lookup results", async () => {
    mockedSearch.mockResolvedValue({
      refunds: [
        {
          refundId: "refund-1",
          refundNo: "REF-SH001-202606-0008",
          issuedAt: "2026-06-26T09:58:00.000Z",
          kind: "SALE_LINKED",
          amount: "290.00",
          reason: null,
          branchId: "branch-shop",
          branchCode: "SH001",
          branchName: "Shop Branch",
          branchAddress: null,
          branchPhone: null,
          companyTaxId: "0123456789012",
          machineTaxId: "MACHINE-001",
          cashierDisplay: "103-Somsak",
          saleId: "sale-1",
          originalReceiptId: "receipt-1",
          originalReceiptNo: "REC-SH001-202606-0111",
          originalReceiptTotal: "860.00",
          archiveStatus: "legacy",
          archiveStatusLabel: "Legacy / no archive",
          pdfUrl: null,
        },
      ],
    })

    const res = await GET(
      new NextRequest(
        "http://localhost/api/pos/refunds/lookup?refundNo=REF-SH001-202606-0008"
      )
    )

    expect(res.status).toBe(200)
    expect(mockedSearch).toHaveBeenCalledWith(expect.anything(), {
      branchId: "branch-shop",
      refundNo: "REF-SH001-202606-0008",
      dateFrom: null,
      dateTo: null,
      limit: undefined,
    })
    await expect(res.json()).resolves.toEqual({
      refunds: [expect.objectContaining({ refundNo: "REF-SH001-202606-0008" })],
    })
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)
    const res = await GET(new NextRequest("http://localhost/api/pos/refunds/lookup"))
    expect(res.status).toBe(401)
    expect(mockedSearch).not.toHaveBeenCalled()
  })
})
