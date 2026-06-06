import { Prisma, RefundKind, SaleStatus } from "@/generated/prisma/client"
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

const defaultReasonCode = "KEY_BLANK_MISTAKE"

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
      reasonCode: defaultReasonCode,
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
      reasonCode: defaultReasonCode,
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

    await createRefund({ saleId, branchId, amount: "60.00", reasonCode: defaultReasonCode })
    const second = await createRefund({ saleId, branchId, amount: "40.00", reasonCode: defaultReasonCode })

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
      createRefund({ saleId, branchId, amount: "100.01", reasonCode: defaultReasonCode })
    ).rejects.toMatchObject({ code: "OVER_REFUND" })
    expect(state.refunds).toHaveLength(0)
  })

  it("rejects when already fully refunded", async () => {
    const { state } = setup()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "50.00",
    })

    await createRefund({ saleId, branchId, reasonCode: defaultReasonCode })
    await expect(
      createRefund({ saleId, branchId, reasonCode: defaultReasonCode })
    ).rejects.toMatchObject({
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

    const result = await createRefund({ saleId, branchId, reasonCode: defaultReasonCode })
    expect(result.amount.toFixed(2)).toBe("150.00")

    const { saleId: sale2 } = seedSaleWithReceipt(state, {
      branchId,
      total: "150.00",
      paymentAmount: "200.00",
      change: "50.00",
    })
    await expect(
      createRefund({ saleId: sale2, branchId, amount: "151.00", reasonCode: defaultReasonCode })
    ).rejects.toMatchObject({ code: "OVER_REFUND" })
  })

  it("rejects refund without saleId as receipt required", async () => {
    const { state } = setup()

    await expect(
      createRefund({ branchId, reason: "Goodwill note" })
    ).rejects.toMatchObject({ code: "RECEIPT_REQUIRED_FOR_REFUND" })
    expect(state.refunds).toHaveLength(0)
  })

  it("rejects goodwill-style refund without saleId", async () => {
    const { state } = setup()

    await expect(
      createRefund({ branchId, amount: "25.00", reason: "Customer goodwill" })
    ).rejects.toMatchObject({ code: "RECEIPT_REQUIRED_FOR_REFUND" })
    expect(state.refunds).toHaveLength(0)
  })

  it("rejects sale-linked refund when sale has no receipt", async () => {
    const { state } = setup()
    state.sales.push({
      id: "sale-no-rcpt",
      branchId,
      staffId: "staff-1",
      total: new Prisma.Decimal("50.00"),
      status: SaleStatus.COMPLETED,
      createdAt: new Date(),
    })

    await expect(
      createRefund({ saleId: "sale-no-rcpt", branchId, reasonCode: defaultReasonCode })
    ).rejects.toMatchObject({ code: "RECEIPT_REQUIRED_FOR_REFUND" })
    expect(state.refunds).toHaveLength(0)
  })

  it("assigns incrementing refundNo for multiple refunds in same branch", async () => {
    const { state } = setup()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "100.00",
    })
    const { saleId: saleId2 } = seedSaleWithReceipt(state, {
      branchId,
      total: "20.00",
    })

    const first = await createRefund({ saleId, branchId, amount: "40.00", reasonCode: defaultReasonCode })
    const second = await createRefund({ saleId: saleId2, branchId, amount: "10.00", reasonCode: defaultReasonCode })

    expect(first.refundNo).not.toBe(second.refundNo)
    expect(state.refunds).toHaveLength(2)
  })

  it("creates no StockTransaction and does not call ledger", async () => {
    const { state } = setup()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "80.00",
    })

    await createRefund({ saleId, branchId, reasonCode: defaultReasonCode })

    expect(state.transactions).toHaveLength(0)
    expect(state.stocks.size).toBe(0)
  })

  it("joins caller tx without opening prisma.$transaction", async () => {
    const { tx, state } = createRefundMockTx()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "30.00",
    })

    await createRefund({ saleId, branchId, tx, reasonCode: defaultReasonCode })

    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(state.refunds).toHaveLength(1)
  })

  it("rejects sale not found", async () => {
    setup()
    await expect(
      createRefund({ saleId: "missing", branchId, reasonCode: defaultReasonCode })
    ).rejects.toBeInstanceOf(RefundError)
  })

  it("stores reasonCode and Thai reason label", async () => {
    const { state } = setup()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "80.00",
    })

    const result = await createRefund({
      saleId,
      branchId,
      reasonCode: "KEY_BLANK_MISTAKE",
    })

    expect(result.reasonCode).toBe("KEY_BLANK_MISTAKE")
    expect(result.reason).toBe("ผิดแบบ (Key Blank mistake) ใส่ไม่เข้า")
    expect(state.refunds[0]?.reasonCode).toBe("KEY_BLANK_MISTAKE")
    expect(state.refunds[0]?.reason).toBe("ผิดแบบ (Key Blank mistake) ใส่ไม่เข้า")
  })

  it("rejects invalid reasonCode", async () => {
    const { state } = setup()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "80.00",
    })

    await expect(
      createRefund({ saleId, branchId, reasonCode: "GOODWILL" })
    ).rejects.toMatchObject({ code: "INVALID_REFUND_REASON" })
    expect(state.refunds).toHaveLength(0)
  })

  it("rejects missing reasonCode", async () => {
    const { state } = setup()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "80.00",
    })

    await expect(createRefund({ saleId, branchId })).rejects.toMatchObject({
      code: "INVALID_REFUND_REASON",
    })
    expect(state.refunds).toHaveLength(0)
  })
})
