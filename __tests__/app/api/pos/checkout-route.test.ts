import { POST } from "@/app/api/pos/checkout/route"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { CheckoutError } from "@/lib/pos/checkout-errors"
import { checkout } from "@/lib/pos/checkout"

jest.mock("@/lib/pos/checkout", () => ({
  checkout: jest.fn(),
}))

const mockedCheckout = checkout as jest.MockedFunction<typeof checkout>

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/pos/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never
  )
}

describe("POST /api/pos/checkout", () => {
  beforeEach(() => {
    mockedCheckout.mockReset()
  })

  it("maps FinancePostingError PERIOD_CLOSED to structured 400 JSON", async () => {
    mockedCheckout.mockRejectedValue(
      new FinancePostingError("period closed", "PERIOD_CLOSED")
    )

    const res = await post({
      branchId: "b1",
      paymentMethod: "CASH",
      paidAmount: 100,
      lines: [{ productId: "p1", quantity: 1 }],
    })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "period closed",
      code: "PERIOD_CLOSED",
    })
  })

  it("maps CheckoutError to structured JSON", async () => {
    mockedCheckout.mockRejectedValue(
      new CheckoutError("Invalid payment method", "INVALID_PAYMENT_METHOD", 400)
    )

    const res = await post({
      branchId: "b1",
      paymentMethod: "BAD",
      paidAmount: 100,
      lines: [],
    })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "Invalid payment method",
      code: "INVALID_PAYMENT_METHOD",
    })
  })
})
