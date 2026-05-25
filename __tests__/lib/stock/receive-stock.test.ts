import { Prisma } from "@/generated/prisma/client"
import { applyReceiveItem } from "@/lib/stock/receive-stock"
import { createMockTx } from "./helpers/mock-tx"

const branchId = "branch-1"
const productId = "product-1"
const ctx = {
  branchId,
  refType: "STOCK_DOC",
  refId: "doc-1",
  documentId: null,
  date: new Date("2026-01-15"),
}

describe("applyReceiveItem", () => {
  it("increments stock, creates layer, writes qtyIn transaction", async () => {
    const { tx, state } = createMockTx()

    const result = await applyReceiveItem(tx, ctx, {
      productId,
      qty: 5,
      unitCost: 10,
      lineId: "line-1",
    })

    expect(result).toBe("applied")
    const stock = state.stocks.get(`${branchId}:${productId}`)
    expect(stock?.qty).toBe(5)
    expect(stock?.avgCost.toNumber()).toBe(10)
    expect(state.layers).toHaveLength(1)
    expect(state.layers[0].qtyRemain).toBe(5)
    expect(state.transactions).toHaveLength(1)
    expect(state.transactions[0].qtyIn).toBe(5)
    expect(state.transactions[0].qtyOut).toBe(0)
  })

  it("skips zero qty without writes", async () => {
    const { tx, state } = createMockTx()

    const result = await applyReceiveItem(tx, ctx, { productId, qty: 0 })

    expect(result).toBe("skipped")
    expect(state.stocks.size).toBe(0)
    expect(state.layers).toHaveLength(0)
    expect(state.transactions).toHaveLength(0)
  })

  it("rejects negative qty", async () => {
    const { tx } = createMockTx()

    await expect(
      applyReceiveItem(tx, ctx, { productId, qty: -3 })
    ).rejects.toMatchObject({ code: "INVALID_QTY" })
  })

  it("recalculates moving average on second receive", async () => {
    const { tx, state } = createMockTx()
    state.stocks.set(`${branchId}:${productId}`, {
      id: "s1",
      branchId,
      productId,
      qty: 10,
      avgCost: new Prisma.Decimal(5),
    })

    await applyReceiveItem(tx, ctx, { productId, qty: 10, unitCost: 15 })

    const stock = state.stocks.get(`${branchId}:${productId}`)
    expect(stock?.qty).toBe(20)
    expect(stock?.avgCost.toNumber()).toBe(10)
  })
})