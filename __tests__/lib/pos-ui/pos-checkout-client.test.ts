import { PaymentMethod } from "@/generated/prisma/client"
import { fetchPosCheckout } from "@/lib/pos-ui/pos-checkout-client"

describe("fetchPosCheckout", () => {
  it("posts productId and qty only when paymentMethod is omitted", async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        sale: { id: "s1", branchId: "b1", staffId: null, total: "10", createdAt: "" },
        items: [],
        payment: { id: "p1", method: "CASH", amount: "10", change: "0" },
        receipt: { id: "r1", receiptNo: "R-1", issuedAt: "" },
        ledger: { applied: 0, skippedZeroQty: 0 },
      }),
    })

    await fetchPosCheckout([{ productId: "p1", qty: 2 }], { fetchFn })

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/pos/checkout",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ lines: [{ productId: "p1", qty: 2 }] }),
      })
    )
  })

  it("includes paymentMethod and paidAmount when provided", async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        sale: { id: "s1", branchId: "b1", staffId: null, total: "10", createdAt: "" },
        items: [],
        payment: { id: "p1", method: "CARD", amount: "10", change: "0" },
        receipt: { id: "r1", receiptNo: "R-1", issuedAt: "" },
        ledger: { applied: 0, skippedZeroQty: 0 },
      }),
    })

    await fetchPosCheckout([{ productId: "p1", qty: 1 }], {
      paymentMethod: PaymentMethod.CARD,
      paidAmount: 10,
      fetchFn,
    })

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/pos/checkout",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          lines: [{ productId: "p1", qty: 1 }],
          paymentMethod: "CARD",
          paidAmount: 10,
        }),
      })
    )
  })
})
