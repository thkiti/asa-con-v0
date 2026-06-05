import { NextRequest } from "next/server"
import { GET } from "@/app/api/pos/refund/preview/route"
import { RefundError } from "@/lib/pos/refund-errors"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/refund", () => ({
  getRefundPreview: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    receipt: {
      findFirst: jest.fn(),
    },
  },
}))

import { getSession } from "@/lib/auth/session"
import { getRefundPreview } from "@/lib/pos/refund"
import { prisma } from "@/lib/shared/prisma"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedGetRefundPreview = getRefundPreview as jest.MockedFunction<
  typeof getRefundPreview
>
const mockedReceiptFindFirst = prisma.receipt.findFirst as jest.Mock

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

describe("GET /api/pos/refund/preview", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue(shopSession)
  })

  it("requires receiptNo or saleId", async () => {
    const res = await GET(new NextRequest("http://localhost/api/pos/refund/preview"))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "Original receipt is required for refund",
      code: "RECEIPT_REQUIRED_FOR_REFUND",
    })
    expect(mockedGetRefundPreview).not.toHaveBeenCalled()
  })

  it("looks up sale by receiptNo in current branch", async () => {
    mockedReceiptFindFirst.mockResolvedValue({ saleId: "sale-1" })
    mockedGetRefundPreview.mockResolvedValue({
      saleId: "sale-1",
      saleTotal: "100.00",
      refundedTotal: "0.00",
      remainingRefundable: "100.00",
      originalReceiptId: "rcpt-1",
      originalReceiptNo: "REC-SH001-202606-0001",
    })

    const res = await GET(
      new NextRequest(
        "http://localhost/api/pos/refund/preview?receiptNo=REC-SH001-202606-0001"
      )
    )

    expect(res.status).toBe(200)
    expect(mockedReceiptFindFirst).toHaveBeenCalledWith({
      where: { branchId: "branch-shop", receiptNo: "REC-SH001-202606-0001" },
      select: { saleId: true },
    })
    expect(mockedGetRefundPreview).toHaveBeenCalledWith(prisma, {
      saleId: "sale-1",
      branchId: "branch-shop",
    })
  })

  it("returns not found for unknown receipt in branch", async () => {
    mockedReceiptFindFirst.mockResolvedValue(null)

    const res = await GET(
      new NextRequest("http://localhost/api/pos/refund/preview?receiptNo=REC-MISSING")
    )

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({
      error: "Sale not found",
      code: "SALE_NOT_FOUND",
    })
  })

  it("maps receipt-required errors from preview domain", async () => {
    mockedGetRefundPreview.mockRejectedValue(
      new RefundError(
        "Original receipt is required for refund",
        "RECEIPT_REQUIRED_FOR_REFUND",
        400
      )
    )

    const res = await GET(
      new NextRequest("http://localhost/api/pos/refund/preview?saleId=sale-no-rcpt")
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      code: "RECEIPT_REQUIRED_FOR_REFUND",
    })
  })
})
