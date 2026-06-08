import { PaymentMethod, ProductType } from "@/generated/prisma/client"
import { checkout } from "@/lib/pos/checkout"
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

jest.mock("@/lib/finance/config", () => ({
  isFinancePostingEnabled: jest.fn(),
}))

jest.mock("@/lib/finance/posting", () => ({
  postSaleVoucher: jest.fn(),
}))

import { isFinancePostingEnabled } from "@/lib/finance/config"
import { postSaleVoucher } from "@/lib/finance/posting"
import { resolvePosRetailPrice } from "@/lib/pricing/resolve-pos-retail-price"
import { prisma } from "@/lib/shared/prisma"

const resolveMock = resolvePosRetailPrice as jest.Mock
const branchId = "branch-1"
const trackedProduct = {
  id: "p-tracked",
  productType: ProductType.TRACKED,
  deleted: false,
}
const consumableProduct = {
  id: "p-consumable",
  productType: ProductType.CONSUMABLE,
  deleted: false,
}

describe("checkout", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma.branch.findUnique as jest.Mock).mockResolvedValue({
      id: branchId,
      deleted: false,
      isActive: true,
    })
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(false)
    ;(postSaleVoucher as jest.Mock).mockResolvedValue({
      voucherId: "v-1",
      alreadyPosted: false,
    })
    resolveMock.mockImplementation(async (_db, input: { productId: string }) => {
      if (input.productId === "p-tracked") return mockResolvedRetailPrice(50)
      if (input.productId === "p-consumable") return mockResolvedRetailPrice(25)
      return mockResolvedRetailPrice(10)
    })
  })

  it("issues stock for TRACKED lines and sets POSTED sale atomically", async () => {
    ;(prisma.product.findMany as jest.Mock).mockResolvedValue([trackedProduct])
    const { tx, state } = createCheckoutMockTx()
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    const result = await checkout({
      branchId,
      staffId: "staff-1",
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 100,
      lines: [{ productId: "p-tracked", qty: 2 }],
    })

    expect(result.ledger.applied).toBe(1)
    expect(state.transactions).toHaveLength(1)
    expect(state.transactions[0].qtyOut).toBe(2)
    expect(state.transactions[0].refType).toBe("POS_SALE")
    expect(state.sales).toHaveLength(1)
    expect(state.payments).toHaveLength(1)
    expect(state.receipts).toHaveLength(1)
    expect(result.items[0].ledgerSkippedReason).toBeNull()
  })

  it("skips ledger for CONSUMABLE with explicit auditable reason", async () => {
    ;(prisma.product.findMany as jest.Mock).mockResolvedValue([consumableProduct])
    const { tx, state } = createCheckoutMockTx()
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    const result = await checkout({
      branchId,
      paymentMethod: PaymentMethod.CARD,
      paidAmount: 25,
      lines: [{ productId: "p-consumable", qty: 1 }],
    })

    expect(result.ledger.applied).toBe(0)
    expect(state.transactions).toHaveLength(0)
    expect(result.items[0].ledgerSkippedReason).toBe("CONSUMABLE")
  })

  it("handles mixed TRACKED and CONSUMABLE in one checkout tx", async () => {
    ;(prisma.product.findMany as jest.Mock).mockResolvedValue([
      trackedProduct,
      consumableProduct,
    ])
    const { tx, state } = createCheckoutMockTx()
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    const result = await checkout({
      branchId,
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 80,
      lines: [
        { productId: "p-tracked", qty: 1 },
        { productId: "p-consumable", qty: 1 },
      ],
    })

    expect(result.ledger.applied).toBe(1)
    expect(state.transactions).toHaveLength(1)
    expect(result.items).toHaveLength(2)
  })

  it("joins caller tx without opening prisma.$transaction", async () => {
    ;(prisma.product.findMany as jest.Mock).mockResolvedValue([trackedProduct])
    const { tx } = createCheckoutMockTx()

    await checkout({
      branchId,
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 0,
      lines: [{ productId: "p-tracked", qty: 1 }],
      tx,
    })

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("rejects insufficient payment before ledger", async () => {
    ;(prisma.product.findMany as jest.Mock).mockResolvedValue([trackedProduct])
    const { tx, state } = createCheckoutMockTx()
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    await expect(
      checkout({
        branchId,
        paymentMethod: PaymentMethod.CASH,
        paidAmount: 5,
        lines: [{ productId: "p-tracked", qty: 1 }],
      })
    ).rejects.toMatchObject({ code: "INSUFFICIENT_PAYMENT" })

    expect(state.sales).toHaveLength(0)
    expect(state.transactions).toHaveLength(0)
  })
})