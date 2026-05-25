import { Prisma } from "@/generated/prisma/client"
import { postDocument } from "@/lib/stock/posting"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import type { StockDocumentWithLines } from "@/lib/stock/posting-types"
import { createPostingMockTx } from "./mock-posting-tx"

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}))

jest.mock("@/lib/finance/config", () => ({
  isFinancePostingEnabled: jest.fn(),
}))

jest.mock("@/lib/finance/posting", () => ({
  postStockDocumentVoucher: jest.fn(),
}))

import { isFinancePostingEnabled } from "@/lib/finance/config"
import { postStockDocumentVoucher } from "@/lib/finance/posting"
import { prisma } from "@/lib/shared/prisma"

function doc(
  partial: Partial<StockDocumentWithLines> & Pick<StockDocumentWithLines, "docType" | "status">
): StockDocumentWithLines {
  return {
    id: "doc-1",
    refNo: "REF-1",
    date: new Date("2026-01-15"),
    branchId: "branch-owner",
    periodMonth: null,
    fromLocId: "branch-from",
    toLocId: "branch-to",
    submittedAt: null,
    confirmedAt: null,
    postedAt: null,
    createdByStaffId: null,
    confirmedByStaffId: null,
    postedByStaffId: null,
    createdAt: new Date("2026-01-01"),
    lines: [],
    ...partial,
  }
}

describe("postDocument finance wiring", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(false)
    ;(postStockDocumentVoucher as jest.Mock).mockResolvedValue({
      voucherId: "v-1",
      alreadyPosted: false,
    })
  })

  function setupTx(initial: StockDocumentWithLines) {
    const mock = createPostingMockTx(initial)
    const { tx, state, getDocument, restoreDocument } = mock
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )
    return { tx, state, getDocument, restoreDocument }
  }

  function setupTxWithRollback(initial: StockDocumentWithLines) {
    const mock = createPostingMockTx(initial)
    const { tx, state, getDocument, restoreDocument } = mock
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => {
        const snapshot = {
          document: structuredClone(getDocument()),
          transactions: [...state.transactions],
        }
        try {
          return await fn(tx)
        } catch (err) {
          restoreDocument(snapshot.document)
          state.transactions = snapshot.transactions
          throw err
        }
      }
    )
    return { tx, state, getDocument, restoreDocument }
  }

  it("posts document without finance hook when flag is off", async () => {
    const initial = doc({
      docType: "PURCHASE",
      status: "RECEIVED",
      lines: [
        {
          id: "l1",
          documentId: "doc-1",
          productId: "p1",
          qty: 2,
          endingQty: null,
          reviewPostingDelta: null,
        },
      ],
    })
    const { getDocument } = setupTx(initial)

    const result = await postDocument({ documentId: "doc-1", postedByStaffId: "staff-1" })

    expect(postStockDocumentVoucher).not.toHaveBeenCalled()
    expect(result.document.status).toBe("POSTED")
    expect(getDocument().status).toBe("POSTED")
  })

  it("calls postStockDocumentVoucher with same tx when finance flag is on", async () => {
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    const initial = doc({
      docType: "PURCHASE",
      status: "RECEIVED",
      lines: [
        {
          id: "l1",
          documentId: "doc-1",
          productId: "p1",
          qty: 3,
          endingQty: null,
          reviewPostingDelta: null,
        },
      ],
    })
    const { tx, state } = setupTx(initial)

    const result = await postDocument({
      documentId: "doc-1",
      postedByStaffId: "staff-1",
    })

    expect(postStockDocumentVoucher).toHaveBeenCalledTimes(1)
    const payload = (postStockDocumentVoucher as jest.Mock).mock.calls[0][0]
    expect(payload.tx).toBe(tx)
    expect(payload.doc.id).toBe("doc-1")
    expect(payload.doc.refNo).toBe("REF-1")
    expect(payload.doc.branchId).toBe("branch-owner")
    expect(payload.doc.docType).toBe("PURCHASE")
    expect(result.document.status).toBe("POSTED")
    expect(state.transactions.length).toBeGreaterThan(0)
  })

  it("rolls back operational writes when finance hook fails", async () => {
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    ;(postStockDocumentVoucher as jest.Mock).mockRejectedValue(
      new FinancePostingError("period closed", "PERIOD_CLOSED")
    )
    const initial = doc({
      docType: "PURCHASE",
      status: "RECEIVED",
      lines: [
        {
          id: "l1",
          documentId: "doc-1",
          productId: "p1",
          qty: 2,
          endingQty: null,
          reviewPostingDelta: null,
        },
      ],
    })
    const { state, getDocument } = setupTxWithRollback(initial)

    await expect(
      postDocument({ documentId: "doc-1", postedByStaffId: "staff-1" })
    ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })

    expect(postStockDocumentVoucher).toHaveBeenCalledTimes(1)
    expect(getDocument().status).toBe("RECEIVED")
    expect(state.transactions.length).toBe(0)
  })

  it("passes inboundValue from ledger unitCost not retail-like totals when flag is on", async () => {
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    const ledgerUnitCost = 12.5
    const qty = 3
    const retailLikeTotal = 50 * qty
    const initial = doc({
      docType: "PURCHASE",
      status: "RECEIVED",
      lines: [
        {
          id: "l1",
          documentId: "doc-1",
          productId: "p1",
          qty,
          endingQty: null,
          reviewPostingDelta: null,
        },
      ],
    })
    const { tx, state } = setupTx(initial)
    const branchId = "branch-to"
    state.stocks.set(`${branchId}:p1`, {
      id: "stock-1",
      branchId,
      productId: "p1",
      qty: 1,
      avgCost: new Prisma.Decimal(ledgerUnitCost),
    })

    await postDocument({ documentId: "doc-1", postedByStaffId: "staff-1" })

    const payload = (postStockDocumentVoucher as jest.Mock).mock.calls[0][0]
    const ledgerInbound = state.transactions
      .filter((t) => t.qtyIn > 0)
      .reduce((sum, t) => sum + t.unitCost.toNumber() * t.qtyIn, 0)

    expect(payload.ledgerResult.inboundValue.toNumber()).toBe(ledgerInbound)
    expect(payload.ledgerResult.inboundValue.toNumber()).toBe(ledgerUnitCost * qty)
    expect(payload.ledgerResult.inboundValue.toNumber()).not.toBe(retailLikeTotal)
    expect(payload.tx).toBe(tx)
  })
})
