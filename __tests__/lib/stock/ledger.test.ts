import { issueStock, receiveStock } from "@/lib/stock/ledger"
import { createMockTx } from "./helpers/mock-tx"

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}))

import { prisma } from "@/lib/shared/prisma"

const branchId = "branch-1"
const productId = "product-1"

describe("ledger transaction boundaries", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("receiveStock joins caller tx without opening prisma.$transaction", async () => {
    const { tx, state } = createMockTx()

    const result = await receiveStock({
      branchId,
      refType: "STOCK_DOC",
      refId: "doc-1",
      items: [{ productId, qty: 2, unitCost: 5 }],
      tx,
    })

    expect(result).toEqual({ applied: 1, skippedZeroQty: 0 })
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(state.stocks.get(`${branchId}:${productId}`)?.qty).toBe(2)
  })

  it("issueStock joins caller tx without opening prisma.$transaction", async () => {
    const { tx, state } = createMockTx()

    const result = await issueStock({
      branchId,
      refType: "POS_SALE",
      refId: "sale-1",
      items: [{ productId, qty: 1 }],
      tx,
    })

    expect(result).toEqual({ applied: 1, skippedZeroQty: 0 })
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(state.stocks.get(`${branchId}:${productId}`)?.qty).toBe(-1)
  })

  it("opens prisma.$transaction when tx omitted", async () => {
    const { tx, state } = createMockTx()
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    await receiveStock({
      branchId,
      refType: "STOCK_DOC",
      refId: "doc-2",
      items: [{ productId, qty: 3, unitCost: 4 }],
    })

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(state.stocks.get(`${branchId}:${productId}`)?.qty).toBe(3)
  })

  it("skips zero-qty lines in batch", async () => {
    const { tx } = createMockTx()

    const result = await receiveStock({
      branchId,
      refType: "STOCK_DOC",
      refId: "doc-3",
      items: [
        { productId, qty: 0 },
        { productId: "product-2", qty: 1, unitCost: 1 },
      ],
      tx,
    })

    expect(result).toEqual({ applied: 1, skippedZeroQty: 1 })
  })
})