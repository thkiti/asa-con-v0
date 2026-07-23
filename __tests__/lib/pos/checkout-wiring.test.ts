import { PaymentMethod, ProductType } from "@/generated/prisma/client"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { checkout } from "@/lib/pos/checkout"
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
const productId = "p-tracked"
const trackedProduct = {
  id: productId,
  productType: ProductType.TRACKED,
  deleted: false,
}

describe("checkout finance wiring", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma.branch.findUnique as jest.Mock).mockResolvedValue({
      id: branchId,
      deleted: false,
      isActive: true,
    })
    ;(prisma.product.findMany as jest.Mock).mockResolvedValue([trackedProduct])
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(false)
    ;(postSaleVoucher as jest.Mock).mockResolvedValue({
      voucherId: "v-1",
      alreadyPosted: false,
    })
    resolveMock.mockResolvedValue(mockResolvedRetailPrice(50))
  })

  function setupTx(initial?: Parameters<typeof createCheckoutMockTx>[0]) {
    const { tx, state } = createCheckoutMockTx(initial)
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )
    return { tx, state }
  }

  function setupTxWithRollback(initial?: Parameters<typeof createCheckoutMockTx>[0]) {
    const { tx, state } = createCheckoutMockTx(initial)
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => {
        const snapshot = {
          sales: [...state.sales],
          saleItems: [...state.saleItems],
          transactions: [...state.transactions],
        }
        try {
          return await fn(tx)
        } catch (err) {
          state.sales = snapshot.sales
          state.saleItems = snapshot.saleItems
          state.transactions = snapshot.transactions
          throw err
        }
      }
    )
    return { tx, state }
  }

  it("completes checkout without finance hook when flag is off", async () => {
    const { state } = setupTx()

    await checkout({
      branchId,
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 50,
      lines: [{ productId, qty: 1 }],
    })

    expect(state.sales.length).toBe(1)
    expect(state.transactions.length).toBe(0)
    expect(postSaleVoucher).not.toHaveBeenCalled()
  })

  it("calls postSaleVoucher with same tx when finance flag is on (cogs=0)", async () => {
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    const { tx, state } = setupTx()

    await checkout({
      branchId,
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 50,
      lines: [{ productId, qty: 1 }],
    })

    expect(postSaleVoucher).toHaveBeenCalledTimes(1)
    const payload = (postSaleVoucher as jest.Mock).mock.calls[0][0]
    expect(payload.tx).toBe(tx)
    expect(payload.sale.id).toBe(state.sales[0]?.id)
    expect(payload.ledgerResult.cogsAmount.toNumber()).toBe(0)
    expect(state.transactions.length).toBe(0)
  })

  it("rolls back operational writes when finance hook fails", async () => {
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    ;(postSaleVoucher as jest.Mock).mockRejectedValue(
      new FinancePostingError("period closed", "PERIOD_CLOSED")
    )
    const { state } = setupTxWithRollback()

    await expect(
      checkout({
        branchId,
        paymentMethod: PaymentMethod.CASH,
        paidAmount: 50,
        lines: [{ productId, qty: 1 }],
      })
    ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })

    expect(postSaleVoucher).toHaveBeenCalledTimes(1)
    expect(state.sales.length).toBe(0)
    expect(state.saleItems.length).toBe(0)
    expect(state.transactions.length).toBe(0)
  })
})
