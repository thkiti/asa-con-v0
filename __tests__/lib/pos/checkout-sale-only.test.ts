import { PaymentMethod, ProductType } from "@/generated/prisma/client"
import { checkoutWithoutPosting } from "@/lib/pos/checkout-sale-only"
import { CheckoutError } from "@/lib/pos/checkout-errors"
import { createCheckoutMockTx } from "./mock-checkout-tx"
import { mockResolvedRetailPrice } from "./helpers/mock-retail-price"

jest.mock("@/lib/pricing/resolve-pos-retail-price", () => ({
  resolvePosRetailPrice: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    branch: { findUnique: jest.fn() },
    product: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}))

import { resolvePosRetailPrice } from "@/lib/pricing/resolve-pos-retail-price"
import { prisma } from "@/lib/shared/prisma"

const resolveMock = resolvePosRetailPrice as jest.Mock
const branchId = "branch-1"

const trackedProduct = {
  id: "p-tracked",
  productType: ProductType.TRACKED,
  deleted: false,
}

describe("checkoutWithoutPosting", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma.branch.findUnique as jest.Mock).mockResolvedValue({
      id: branchId,
      deleted: false,
      isActive: true,
    })
    resolveMock.mockImplementation(async (_db, input: { productId: string }) => {
      if (input.productId === "p-tracked") return mockResolvedRetailPrice(50)
      if (input.productId === "p-consumable") return mockResolvedRetailPrice(25)
      return null
    })
  })

  it("creates sale, items, payment, receipt without stock transactions", async () => {
    ;(prisma.product.findMany as jest.Mock).mockResolvedValue([trackedProduct])
    const { tx, state } = createCheckoutMockTx()
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    const result = await checkoutWithoutPosting({
      branchId,
      staffId: "staff-1",
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 0,
      lines: [{ productId: "p-tracked", qty: 2 }],
    })

    expect(result.ledger.applied).toBe(0)
    expect(state.transactions).toHaveLength(0)
    expect(state.sales).toHaveLength(1)
    expect(state.saleItems[0].unitPrice.toNumber()).toBe(50)
    expect(state.payments).toHaveLength(1)
    expect(state.payments[0].method).toBe(PaymentMethod.CASH)
    expect(state.receipts).toHaveLength(1)
    expect(result.receipt.receiptNo).toBe("REC-SH001-202601-0001")
  })

  it("rejects non-CASH payment", async () => {
    ;(prisma.product.findMany as jest.Mock).mockResolvedValue([trackedProduct])
    await expect(
      checkoutWithoutPosting({
        branchId,
        paymentMethod: PaymentMethod.CARD,
        paidAmount: 50,
        lines: [{ productId: "p-tracked", qty: 1 }],
      })
    ).rejects.toMatchObject({ code: "PAYMENT_METHOD_NOT_ALLOWED" })
  })

  it("rejects when no active selling price", async () => {
    ;(prisma.product.findMany as jest.Mock).mockResolvedValue([trackedProduct])
    resolveMock.mockResolvedValue(null)
    const { tx, state } = createCheckoutMockTx()
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    await expect(
      checkoutWithoutPosting({
        branchId,
        paymentMethod: PaymentMethod.CASH,
        paidAmount: 0,
        lines: [{ productId: "p-tracked", qty: 1 }],
      })
    ).rejects.toMatchObject({ code: "NO_ACTIVE_PRICE" })

    expect(state.sales).toHaveLength(0)
  })

  it("rejects empty cart", async () => {
    await expect(
      checkoutWithoutPosting({
        branchId,
        paymentMethod: PaymentMethod.CASH,
        paidAmount: 0,
        lines: [],
      })
    ).rejects.toMatchObject({ code: "EMPTY_CART" })
  })
})
