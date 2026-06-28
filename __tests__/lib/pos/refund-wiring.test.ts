import { FinancePostingError } from "@/lib/finance/posting-errors"
import { createRefund } from "@/lib/pos/refund"
import { createRefundMockTx, seedSaleWithReceipt } from "./mock-refund-tx"

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}))

jest.mock("@/lib/finance/config", () => ({
  isFinancePostingEnabled: jest.fn(),
}))

jest.mock("@/lib/finance/posting", () => ({
  postRefundVoucher: jest.fn(),
}))

jest.mock("@/lib/stock/ledger", () => ({
  issueStock: jest.fn(),
  receiveStock: jest.fn(),
}))

import { isFinancePostingEnabled } from "@/lib/finance/config"
import { postRefundVoucher } from "@/lib/finance/posting"
import { receiveStock } from "@/lib/stock/ledger"
import { prisma } from "@/lib/shared/prisma"

const branchId = "branch-1"
const defaultReasonCode = "KEY_BLANK_MISTAKE"

describe("refund finance wiring", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(false)
    ;(postRefundVoucher as jest.Mock).mockResolvedValue({
      voucherId: "v-refund-1",
      alreadyPosted: false,
    })
  })

  function setup() {
    const { tx, state } = createRefundMockTx()
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )
    return { tx, state }
  }

  function setupWithRollback() {
    const { tx, state } = createRefundMockTx()
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => {
        const snapshot = {
          refunds: [...state.refunds],
        }
        try {
          return await fn(tx)
        } catch (err) {
          state.refunds = snapshot.refunds
          throw err
        }
      }
    )
    return { tx, state }
  }

  it("completes refund without finance hook when flag is off", async () => {
    const { state } = setup()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "100.00",
    })

    await createRefund({ saleId, branchId, reasonCode: defaultReasonCode })

    expect(state.refunds).toHaveLength(1)
    expect(postRefundVoucher).not.toHaveBeenCalled()
    expect(receiveStock).not.toHaveBeenCalled()
    expect(state.transactions).toHaveLength(0)
  })

  it("calls postRefundVoucher with same tx when finance flag is on", async () => {
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    const { tx, state } = setup()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "100.00",
    })

    const result = await createRefund({
      saleId,
      branchId,
      reasonCode: defaultReasonCode,
    })

    expect(postRefundVoucher).toHaveBeenCalledTimes(1)
    const payload = (postRefundVoucher as jest.Mock).mock.calls[0][0]
    expect(payload.tx).toBe(tx)
    expect(payload.refund.id).toBe(result.id)
    expect(payload.refund.branchId).toBe(branchId)
    expect(payload.refund.refundNo).toBe(result.refundNo)
    expect(payload.paymentMethod).toBe("CASH")
    expect(receiveStock).not.toHaveBeenCalled()
    expect(state.transactions).toHaveLength(0)
  })

  it("rolls back refund row when finance hook fails", async () => {
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    ;(postRefundVoucher as jest.Mock).mockRejectedValue(
      new FinancePostingError("period closed", "PERIOD_CLOSED")
    )
    const { state } = setupWithRollback()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "60.00",
    })

    await expect(
      createRefund({ saleId, branchId, reasonCode: defaultReasonCode })
    ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })

    expect(postRefundVoucher).toHaveBeenCalledTimes(1)
    expect(state.refunds).toHaveLength(0)
    expect(state.transactions).toHaveLength(0)
  })

  it("rejects finance posting when sale lacks VAT snapshot", async () => {
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    const { state } = setupWithRollback()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "107.00",
      skipVatSnapshot: true,
    })

    await expect(
      createRefund({ saleId, branchId, reasonCode: defaultReasonCode })
    ).rejects.toMatchObject({ code: "MISSING_VAT_SNAPSHOT" })

    expect(postRefundVoucher).not.toHaveBeenCalled()
    expect(state.refunds).toHaveLength(0)
  })

  it("passes sale VAT snapshot to postRefundVoucher for 107 gross @ 7%", async () => {
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    const { state } = setup()
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "107.00",
    })

    await createRefund({ saleId, branchId, reasonCode: defaultReasonCode })

    const payload = (postRefundVoucher as jest.Mock).mock.calls[0][0]
    expect(payload.vatEconomics).toMatchObject({
      rateBps: 700,
      taxCode: "VAT_OUTPUT_STANDARD",
      outputVatAccountCode: "4602",
    })
    expect(payload.vatEconomics.net.toFixed(2)).toBe("100.00")
    expect(payload.vatEconomics.vat.toFixed(2)).toBe("7.00")
  })
})
