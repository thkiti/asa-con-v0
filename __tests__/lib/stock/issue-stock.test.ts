import { Prisma } from "@/generated/prisma/client"
import { applyIssueItem } from "@/lib/stock/issue-stock"
import { createMockTx } from "./helpers/mock-tx"

const branchId = "branch-1"
const productId = "product-1"
const ctx = {
  branchId,
  refType: "POS_SALE",
  refId: "sale-1",
  documentId: null,
  date: new Date("2026-01-15"),
}

describe("applyIssueItem", () => {
  it("decrements stock, consumes FIFO layers, writes qtyOut transaction", async () => {
    const { tx, state } = createMockTx()
    state.stocks.set(`${branchId}:${productId}`, {
      id: "s1",
      branchId,
      productId,
      qty: 10,
      avgCost: new Prisma.Decimal(8),
    })
    state.layers.push(
      {
        id: "layer-old",
        branchId,
        productId,
        qty: 4,
        qtyRemain: 4,
        unitCost: new Prisma.Decimal(5),
        refType: "STOCK_DOC",
        refId: "in-1",
        createdAt: new Date("2026-01-01"),
      },
      {
        id: "layer-new",
        branchId,
        productId,
        qty: 6,
        qtyRemain: 6,
        unitCost: new Prisma.Decimal(10),
        refType: "STOCK_DOC",
        refId: "in-2",
        createdAt: new Date("2026-01-10"),
      }
    )

    const result = await applyIssueItem(tx, ctx, {
      productId,
      qty: 5,
      lineId: "line-1",
    })

    expect(result).toBe("applied")
    const stock = state.stocks.get(`${branchId}:${productId}`)
    expect(stock?.qty).toBe(5)
    expect(state.layers.find((l) => l.id === "layer-old")?.qtyRemain).toBe(0)
    expect(state.layers.find((l) => l.id === "layer-new")?.qtyRemain).toBe(5)
    expect(state.transactions[0].qtyOut).toBe(5)
    expect(state.transactions[0].qtyIn).toBe(0)
    // FIFO: 4 @5 + 1 @10 = 30 / 5 = 6
    expect(state.transactions[0].unitCost.toNumber()).toBe(6)
  })

  it("allows negative stock when outbound exceeds on-hand", async () => {
    const { tx, state } = createMockTx()
    state.stocks.set(`${branchId}:${productId}`, {
      id: "s1",
      branchId,
      productId,
      qty: 3,
      avgCost: new Prisma.Decimal(12),
    })

    await applyIssueItem(tx, ctx, { productId, qty: 10 })

    const stock = state.stocks.get(`${branchId}:${productId}`)
    expect(stock?.qty).toBe(-7)
    expect(state.transactions[0].afterQty).toBe(-7)
  })

  it("skips zero qty", async () => {
    const { tx, state } = createMockTx()

    const result = await applyIssueItem(tx, ctx, { productId, qty: 0 })

    expect(result).toBe("skipped")
    expect(state.transactions).toHaveLength(0)
  })

  it("rejects negative qty magnitude", async () => {
    const { tx } = createMockTx()

    await expect(
      applyIssueItem(tx, ctx, { productId, qty: -2 })
    ).rejects.toMatchObject({ code: "INVALID_QTY" })
  })
})