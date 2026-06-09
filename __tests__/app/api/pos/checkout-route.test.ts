import { NextRequest } from "next/server"
import { POST } from "@/app/api/pos/checkout/route"
import { CheckoutError } from "@/lib/pos/checkout-errors"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/checkout", () => ({
  checkout: jest.fn(),
}))

import { getSession } from "@/lib/auth/session"
import { checkout } from "@/lib/pos/checkout"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedCheckout = checkout as jest.MockedFunction<typeof checkout>

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
    new NextRequest("http://localhost/api/pos/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  )
}

describe("POST /api/pos/checkout", () => {
  beforeEach(() => {
    mockedGetSession.mockReset()
    mockedCheckout.mockReset()
  })

  it("calls checkout with session branch and CASH by default", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedCheckout.mockResolvedValue({
      sale: {
        id: "sale-1",
        branchId: "branch-shop",
        staffId: "staff-1",
        total: { toString: () => "50.00" },
        createdAt: new Date(),
      },
      items: [],
      payment: {
        id: "pay-1",
        method: "CASH",
        amount: { toString: () => "50.00" },
        change: { toString: () => "0.00" },
      },
      receipt: {
        id: "rcpt-1",
        receiptNo: "R-branch-s-20260115-0001",
        issuedAt: new Date(),
      },
      ledger: { applied: 0, skippedZeroQty: 0 },
    } as never)

    const res = await post({
      lines: [{ productId: "p1", qty: 1 }],
    })

    expect(res.status).toBe(200)
    expect(mockedCheckout).toHaveBeenCalledWith({
      branchId: "branch-shop",
      staffId: "staff-1",
      paymentMethod: "CASH",
      paidAmount: 0,
      lines: [{ productId: "p1", qty: 1 }],
    })
  })

  it("forwards paymentMethod and paidAmount from the request body", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedCheckout.mockResolvedValue({
      sale: {
        id: "sale-2",
        branchId: "branch-shop",
        staffId: "staff-1",
        total: { toString: () => "100.00" },
        createdAt: new Date(),
      },
      items: [],
      payment: {
        id: "pay-2",
        method: "BANK_TRANSFER",
        amount: { toString: () => "100.00" },
        change: { toString: () => "0.00" },
      },
      receipt: {
        id: "rcpt-2",
        receiptNo: "R-branch-s-20260115-0002",
        issuedAt: new Date(),
      },
      ledger: { applied: 0, skippedZeroQty: 0 },
    } as never)

    const res = await post({
      lines: [{ productId: "p1", qty: 1 }],
      paymentMethod: "BANK_TRANSFER",
      paidAmount: 100,
    })

    expect(res.status).toBe(200)
    expect(mockedCheckout).toHaveBeenCalledWith({
      branchId: "branch-shop",
      staffId: "staff-1",
      paymentMethod: "BANK_TRANSFER",
      paidAmount: 100,
      lines: [{ productId: "p1", qty: 1 }],
    })
  })

  it("rejects invalid paymentMethod", async () => {
    mockedGetSession.mockResolvedValue(shopSession)

    const res = await post({
      lines: [{ productId: "p1", qty: 1 }],
      paymentMethod: "PROMPTPAY",
    })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "Invalid payment method",
      code: "INVALID_PAYMENT_METHOD",
    })
    expect(mockedCheckout).not.toHaveBeenCalled()
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)
    const res = await post({ lines: [{ productId: "p1", qty: 1 }] })
    expect(res.status).toBe(401)
    expect(mockedCheckout).not.toHaveBeenCalled()
  })

  it("maps CheckoutError to structured JSON", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedCheckout.mockRejectedValue(
      new CheckoutError("Cart is empty", "EMPTY_CART", 400)
    )

    const res = await post({ lines: [] })
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "Cart is empty",
      code: "EMPTY_CART",
    })
  })
})
