import { NextRequest } from "next/server"
import { POST } from "@/app/api/pos/refund/route"
import { RefundError } from "@/lib/pos/refund-errors"
import { RefundKind } from "@/generated/prisma/client"
import { Prisma } from "@/generated/prisma/client"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/refund", () => ({
  createRefund: jest.fn(),
}))

import { getSession } from "@/lib/auth/session"
import { createRefund } from "@/lib/pos/refund"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedCreateRefund = createRefund as jest.MockedFunction<typeof createRefund>

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

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/pos/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  )
}

describe("POST /api/pos/refund", () => {
  beforeEach(() => {
    mockedGetSession.mockReset()
    mockedCreateRefund.mockReset()
  })

  it("calls createRefund with session branchId and staffId", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedCreateRefund.mockResolvedValue({
      id: "refund-1",
      refundNo: "REF-SH001-202606-0001",
      kind: RefundKind.SALE_LINKED,
      saleId: "sale-1",
      branchId: "branch-shop",
      staffId: "staff-1",
      originalReceiptId: "rcpt-1",
      amount: new Prisma.Decimal("50.00"),
      reason: null,
      createdAt: new Date(),
    })

    const res = await post({ saleId: "sale-1" })

    expect(res.status).toBe(200)
    expect(mockedCreateRefund).toHaveBeenCalledWith({
      saleId: "sale-1",
      branchId: "branch-shop",
      staffId: "staff-1",
      amount: undefined,
      reason: null,
    })
    await expect(res.json()).resolves.toMatchObject({
      refund: { id: "refund-1", refundNo: "REF-SH001-202606-0001", amount: "50.00" },
    })
  })

  it("passes explicit partial amount and reason", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedCreateRefund.mockResolvedValue({
      id: "refund-2",
      refundNo: "REF-SH001-202606-0002",
      kind: RefundKind.SALE_LINKED,
      saleId: "sale-1",
      branchId: "branch-shop",
      staffId: "staff-1",
      originalReceiptId: null,
      amount: new Prisma.Decimal("25.50"),
      reason: "Key defective",
      createdAt: new Date(),
    })

    await post({
      saleId: "sale-1",
      amount: "25.50",
      reason: "Key defective",
    })

    expect(mockedCreateRefund).toHaveBeenCalledWith({
      saleId: "sale-1",
      branchId: "branch-shop",
      staffId: "staff-1",
      amount: "25.50",
      reason: "Key defective",
    })
  })

  it("goodwill body without saleId", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedCreateRefund.mockResolvedValue({
      id: "refund-3",
      refundNo: "REF-SH001-202606-0003",
      kind: RefundKind.GOODWILL,
      saleId: null,
      branchId: "branch-shop",
      staffId: "staff-1",
      originalReceiptId: null,
      amount: new Prisma.Decimal("10.00"),
      reason: "Goodwill",
      createdAt: new Date(),
    })

    await post({ amount: "10.00", reason: "Goodwill" })

    expect(mockedCreateRefund).toHaveBeenCalledWith({
      saleId: undefined,
      branchId: "branch-shop",
      staffId: "staff-1",
      amount: "10.00",
      reason: "Goodwill",
    })
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)
    const res = await post({ saleId: "sale-1" })
    expect(res.status).toBe(401)
    expect(mockedCreateRefund).not.toHaveBeenCalled()
  })

  it("maps RefundError to structured JSON", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedCreateRefund.mockRejectedValue(
      new RefundError("Sale is already fully refunded", "ALREADY_FULLY_REFUNDED", 400)
    )

    const res = await post({ saleId: "sale-1" })
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "Sale is already fully refunded",
      code: "ALREADY_FULLY_REFUNDED",
    })
  })
})
