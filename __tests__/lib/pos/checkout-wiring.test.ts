import { PaymentMethod, Prisma, ProductType } from "@/generated/prisma/client"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { checkout } from "@/lib/pos/checkout"
import { createCheckoutMockTx, type CheckoutMockState } from "./mock-checkout-tx"

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
import { prisma } from "@/lib/shared/prisma"

const branchId = "branch-1"
const productId = "p-tracked"
const trackedProduct = {
  id: productId,
  productType: ProductType.TRACKED,
  deleted: false,
}

function seedTrackedStock(
  state: CheckoutMockState,
  qty: number,
  avgCost: number
) {
  const key = `${branchId}:${productId}`
  state.stocks.set(key, {
    id: "stock-1",
    branchId,
    productId,
    qty,
    avgCost: new Prisma.Decimal(avgCost),
  })
  state.layers.push({
    id: "layer-1",
    branchId,
    productId,
    qty,
    qtyRemain: qty,
    unitCost: new Prisma.Decimal(avgCost),
    refType: null,
    refId: null,
    createdAt: new Date("2026-01-01"),
  })
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
    seedTrackedStock(state, 5, 10)

    await checkout({
      branchId,
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 50,
      lines: [{ productId, qty: 1, unitPrice: 50 }],
    })

    expect(state.sales.length).toBe(1)
    expect(postSaleVoucher).not.toHaveBeenCalled()
  })

  it("calls postSaleVoucher with same tx when finance flag is on", async () => {
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    const { tx, state } = setupTx()
    seedTrackedStock(state, 5, 10)

    await checkout({
      branchId,
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 50,
      lines: [{ productId, qty: 1, unitPrice: 50 }],
    })

    expect(postSaleVoucher).toHaveBeenCalledTimes(1)
    const payload = (postSaleVoucher as jest.Mock).mock.calls[0][0]
    expect(payload.tx).toBe(tx)
    expect(payload.sale.id).toBe(state.sales[0]?.id)
    expect(payload.sale.branchId).toBe(branchId)
    expect(payload.sale.paymentMethod).toBe(PaymentMethod.CASH)
    expect(state.transactions.length).toBeGreaterThan(0)
  })

  it("rolls back operational writes when finance hook fails", async () => {
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    ;(postSaleVoucher as jest.Mock).mockRejectedValue(
      new FinancePostingError("period closed", "PERIOD_CLOSED")
    )
    const { state } = setupTxWithRollback()
    seedTrackedStock(state, 5, 10)

    await expect(
      checkout({
        branchId,
        paymentMethod: PaymentMethod.CASH,
        paidAmount: 50,
        lines: [{ productId, qty: 1, unitPrice: 50 }],
      })
    ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })

    expect(postSaleVoucher).toHaveBeenCalledTimes(1)
    expect(state.sales.length).toBe(0)
    expect(state.saleItems.length).toBe(0)
    expect(state.transactions.length).toBe(0)
  })

  it("passes ledger COGS from unitCost not retail unitPrice when flag is on", async () => {
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    const { state } = setupTx()
    seedTrackedStock(state, 5, 10)
    const qty = 2
    const unitPrice = 50

    await checkout({
      branchId,
      paymentMethod: PaymentMethod.CASH,
      paidAmount: qty * unitPrice,
      lines: [{ productId, qty, unitPrice }],
    })

    const payload = (postSaleVoucher as jest.Mock).mock.calls[0][0]
    expect(payload.ledgerResult.cogsAmount.toNumber()).toBe(10 * qty)
    expect(payload.ledgerResult.cogsAmount.toNumber()).not.toBe(unitPrice * qty)
  })
})
