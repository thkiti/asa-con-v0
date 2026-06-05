import { Prisma, RefundKind } from "@/generated/prisma/client"
import { createRefund } from "@/lib/pos/refund"
import { RefundError } from "@/lib/pos/refund-errors"
import { createRefundMockTx, seedSaleWithReceipt } from "./mock-refund-tx"

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}))

import { prisma } from "@/lib/shared/prisma"

const branchId = "branch-1"

describe("createRefund", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  function setup() {
    const { tx, state } = createRefundMockTx()
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )
    return { tx, state }
  }

  it("sale-linked default full remaining refund when amount omitted", async () => {
    const { state } = setup()
    const { saleId, receiptId } = seedSaleWithReceipt(state, {
      branchId,
      total: "150.00",
    })

    const result = await createRefund({
      saleId,
      branchId,
      staffId: "staff-9",
    })

    expect(result.kind).toBe(RefundKind.SALE_LINKED)
    expect(result.amount.toFixed(2)).toBe("150.00")
    expect(result.saleId).toBe(saleId)
    expect(result.originalReceiptId).toBe(receiptId)
    expect(result.refundNo).toMatch(/^REF-SH001-\d{6}-\d{4}$/)
    expect(state.refunds).toHaveLength(1)
    expect(state.refunds[0]?.refundNo).toBe(result.refundNo)
  })

  it("sale-linked explicit partial refund", async () => {
    const { state } = setup()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "100.00",
    })

    const result = await createRefund({
      saleId,
      branchId,
      amount: "40.00",
    })

    expect(result.amount.toFixed(2)).toBe("40.00")
    expect(state.refunds[0]?.amount.toFixed(2)).toBe("40.00")
  })

  it("allows two partial refunds up to sale.total", async () => {
    const { state } = setup()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "100.00",
    })

    await createRefund({ saleId, branchId, amount: "60.00" })
    const second = await createRefund({ saleId, branchId, amount: "40.00" })

    expect(second.amount.toFixed(2)).toBe("40.00")
    expect(state.refunds).toHaveLength(2)
    const sum = state.refunds.reduce(
      (acc, r) => acc.plus(r.amount),
      new Prisma.Decimal(0)
    )
    expect(sum.toFixed(2)).toBe("100.00")
  })

  it("rejects over-refund", async () => {
    const { state } = setup()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "100.00",
    })

    await expect(
      createRefund({ saleId, branchId, amount: "100.01" })
    ).rejects.toMatchObject({ code: "OVER_REFUND" })
    expect(state.refunds).toHaveLength(0)
  })

  it("rejects when already fully refunded", async () => {
    const { state } = setup()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "50.00",
    })

    await createRefund({ saleId, branchId })
    await expect(createRefund({ saleId, branchId })).rejects.toMatchObject({
      code: "ALREADY_FULLY_REFUNDED",
    })
  })

  it("caps against sale.total not payment.amount when cash change exists", async () => {
    const { state } = setup()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "150.00",
      paymentAmount: "200.00",
      change: "50.00",
    })

    const result = await createRefund({ saleId, branchId })
    expect(result.amount.toFixed(2)).toBe("150.00")

    const { saleId: sale2 } = seedSaleWithReceipt(state, {
      branchId,
      total: "150.00",
      paymentAmount: "200.00",
      change: "50.00",
    })
    await expect(
      createRefund({ saleId: sale2, branchId, amount: "151.00" })
    ).rejects.toMatchObject({ code: "OVER_REFUND" })
  })

  it("goodwill refund requires amount", async () => {
    const { state } = setup()

    await expect(
      createRefund({ branchId, reason: "Goodwill note" })
    ).rejects.toMatchObject({ code: "INVALID_REFUND_AMOUNT" })
    expect(state.refunds).toHaveLength(0)
  })

  it("goodwill refund requires reason", async () => {
    const { state } = setup()

    await expect(
      createRefund({ branchId, amount: "25.00", reason: "  " })
    ).rejects.toMatchObject({ code: "GOODWILL_REASON_REQUIRED" })
    expect(state.refunds).toHaveLength(0)
  })

  it("goodwill refund creates saleId null and originalReceiptId null", async () => {
    const { state } = setup()

    const result = await createRefund({
      branchId,
      amount: "25.00",
      reason: "Customer goodwill",
      staffId: "staff-2",
    })

    expect(result.kind).toBe(RefundKind.GOODWILL)
    expect(result.saleId).toBeNull()
    expect(result.originalReceiptId).toBeNull()
    expect(result.reason).toBe("Customer goodwill")
    expect(result.refundNo).toMatch(/^REF-SH001-\d{6}-\d{4}$/)
    expect(state.refunds[0]?.saleId).toBeNull()
    expect(state.refunds[0]?.originalReceiptId).toBeNull()
    expect(state.refunds[0]?.refundNo).toBe(result.refundNo)
  })

  it("assigns incrementing refundNo for multiple refunds in same branch", async () => {
    const { state } = setup()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "100.00",
    })

    const first = await createRefund({ saleId, branchId, amount: "40.00" })
    const second = await createRefund({ branchId, amount: "10.00", reason: "Goodwill" })

    expect(first.refundNo).not.toBe(second.refundNo)
    expect(state.refunds).toHaveLength(2)
  })

  it("creates no StockTransaction and does not call ledger", async () => {
    const { state } = setup()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "80.00",
    })

    await createRefund({ saleId, branchId })

    expect(state.transactions).toHaveLength(0)
    expect(state.stocks.size).toBe(0)
  })

  it("joins caller tx without opening prisma.$transaction", async () => {
    const { tx, state } = createRefundMockTx()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "30.00",
    })

    await createRefund({ saleId, branchId, tx })

    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(state.refunds).toHaveLength(1)
  })

  it("rejects sale not found", async () => {
    setup()
    await expect(
      createRefund({ saleId: "missing", branchId })
    ).rejects.toBeInstanceOf(RefundError)
  })
})
