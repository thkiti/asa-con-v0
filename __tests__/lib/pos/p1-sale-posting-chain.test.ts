import { PaymentMethod, Prisma, ProductType } from "@/generated/prisma/client"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { checkout } from "@/lib/pos/checkout"
import { createCheckoutMockTx, type CheckoutMockState } from "./mock-checkout-tx"
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
const trackedProductId = "p-tracked"
const consumableProductId = "p-consumable"

const trackedProduct = {
  id: trackedProductId,
  productType: ProductType.TRACKED,
  deleted: false,
}
const consumableProduct = {
  id: consumableProductId,
  productType: ProductType.CONSUMABLE,
  deleted: false,
}

function seedTrackedStock(
  state: CheckoutMockState,
  qty: number,
  avgCost: number
) {
  const key = `${branchId}:${trackedProductId}`
  state.stocks.set(key, {
    id: "stock-1",
    branchId,
    productId: trackedProductId,
    qty,
    avgCost: new Prisma.Decimal(avgCost),
  })
  state.layers.push({
    id: "layer-1",
    branchId,
    productId: trackedProductId,
    qty,
    qtyRemain: qty,
    unitCost: new Prisma.Decimal(avgCost),
    refType: null,
    refId: null,
    createdAt: new Date("2026-01-01"),
  })
}

describe("P1 sale posting chain", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma.branch.findUnique as jest.Mock).mockResolvedValue({
      id: branchId,
      deleted: false,
      isActive: true,
    })
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    ;(postSaleVoucher as jest.Mock).mockResolvedValue({
      voucherId: "v-1",
      alreadyPosted: false,
    })
    resolveMock.mockImplementation(async (_db, input: { productId: string }) => {
      if (input.productId === trackedProductId) return mockResolvedRetailPrice(50)
      if (input.productId === consumableProductId) return mockResolvedRetailPrice(25)
      return mockResolvedRetailPrice(10)
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
          payments: [...state.payments],
          receipts: [...state.receipts],
          transactions: [...state.transactions],
          stocks: new Map(state.stocks),
          layers: [...state.layers],
        }
        try {
          return await fn(tx)
        } catch (err) {
          state.sales = snapshot.sales
          state.saleItems = snapshot.saleItems
          state.payments = snapshot.payments
          state.receipts = snapshot.receipts
          state.transactions = snapshot.transactions
          state.stocks = snapshot.stocks
          state.layers = snapshot.layers
          throw err
        }
      }
    )
    return { tx, state }
  }

  it("deducts stock with POS_SALE ledger row and posts finance voucher", async () => {
    ;(prisma.product.findMany as jest.Mock).mockResolvedValue([trackedProduct])
    const { tx, state } = setupTx()
    seedTrackedStock(state, 10, 12.5)
    const qty = 2

    const result = await checkout({
      branchId,
      paymentMethod: PaymentMethod.CASH,
      paidAmount: qty * 50,
      lines: [{ productId: trackedProductId, qty }],
    })

    const saleId = result.sale.id
    const stockKey = `${branchId}:${trackedProductId}`
    const stock = state.stocks.get(stockKey)

    expect(stock?.qty).toBe(8)
    expect(state.transactions).toHaveLength(1)
    expect(state.transactions[0]).toMatchObject({
      refType: "POS_SALE",
      refId: saleId,
      qtyOut: qty,
      beforeQty: 10,
      afterQty: 8,
    })

    expect(postSaleVoucher).toHaveBeenCalledTimes(1)
    const payload = (postSaleVoucher as jest.Mock).mock.calls[0][0]
    expect(payload.tx).toBe(tx)
    expect(payload.sale.id).toBe(saleId)
    expect(payload.ledgerResult.cogsAmount.toNumber()).toBe(12.5 * qty)
  })

  it("skips stock movement for CONSUMABLE when finance is enabled", async () => {
    ;(prisma.product.findMany as jest.Mock).mockResolvedValue([consumableProduct])
    const { state } = setupTx()

    const result = await checkout({
      branchId,
      paymentMethod: PaymentMethod.CARD,
      paidAmount: 25,
      lines: [{ productId: consumableProductId, qty: 1 }],
    })

    expect(result.ledger.applied).toBe(0)
    expect(state.transactions).toHaveLength(0)
    expect(result.items[0].ledgerSkippedReason).toBe("CONSUMABLE")
    expect(postSaleVoucher).toHaveBeenCalledTimes(1)
  })

  it("rolls back stock and sale when finance hook fails", async () => {
    ;(prisma.product.findMany as jest.Mock).mockResolvedValue([trackedProduct])
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
        lines: [{ productId: trackedProductId, qty: 1 }],
      })
    ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })

    expect(state.sales).toHaveLength(0)
    expect(state.transactions).toHaveLength(0)
  })
})
