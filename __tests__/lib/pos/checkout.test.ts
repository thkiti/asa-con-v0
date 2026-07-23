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

  it("completes TRACKED sale without creating StockTransaction", async () => {
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

    expect(result.ledger.applied).toBe(0)
    expect(state.transactions).toHaveLength(0)
    expect(state.stocks.size).toBe(0)
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

  it("retry-safe: second checkout creates another sale still without StockTransaction", async () => {
    ;(prisma.product.findMany as jest.Mock).mockResolvedValue([trackedProduct])
    const { tx, state } = createCheckoutMockTx()
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    await checkout({
      branchId,
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 50,
      lines: [{ productId: "p-tracked", qty: 1 }],
    })
    await checkout({
      branchId,
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 50,
      lines: [{ productId: "p-tracked", qty: 1 }],
    })

    expect(state.sales).toHaveLength(2)
    expect(state.transactions).toHaveLength(0)
  })

  it("posts non-inventory sale Finance without COGS when finance enabled", async () => {
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    ;(prisma.product.findMany as jest.Mock).mockResolvedValue([trackedProduct])
    const { tx, state } = createCheckoutMockTx()
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    await checkout({
      branchId,
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 100,
      lines: [{ productId: "p-tracked", qty: 2 }],
    })

    expect(state.transactions).toHaveLength(0)
    expect(postSaleVoucher).toHaveBeenCalledTimes(1)
    const arg = (postSaleVoucher as jest.Mock).mock.calls[0][0]
    expect(arg.ledgerResult?.cogsAmount?.toString?.() ?? String(arg.ledgerResult?.cogsAmount)).toBe(
      "0"
    )
  })

  it("rejects checkout when branch missing", async () => {
    ;(prisma.branch.findUnique as jest.Mock).mockResolvedValue(null)
    await expect(
      checkout({
        branchId,
        paymentMethod: PaymentMethod.CASH,
        paidAmount: 10,
        lines: [{ productId: "p-tracked", qty: 1 }],
      })
    ).rejects.toBeInstanceOf(CheckoutError)
  })
})
