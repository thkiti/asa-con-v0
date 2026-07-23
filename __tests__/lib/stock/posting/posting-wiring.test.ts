import { postDocument } from "@/lib/stock/posting"
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

describe("postDocument finance wiring (inventory vouchers retired)", () => {
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
    const { tx, state, getDocument } = mock
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )
    return { tx, state, getDocument }
  }

  it("posts document without StockTransaction or inventory voucher when flag is off", async () => {
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
    const { getDocument, state } = setupTx(initial)

    const result = await postDocument({ documentId: "doc-1", postedByStaffId: "staff-1" })

    expect(postStockDocumentVoucher).not.toHaveBeenCalled()
    expect(result.document.status).toBe("POSTED")
    expect(getDocument().status).toBe("POSTED")
    expect(state.transactions).toHaveLength(0)
  })

  it("does not call postStockDocumentVoucher even when finance flag is on", async () => {
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
    const { state } = setupTx(initial)

    const result = await postDocument({
      documentId: "doc-1",
      postedByStaffId: "staff-1",
    })

    expect(postStockDocumentVoucher).not.toHaveBeenCalled()
    expect(result.document.status).toBe("POSTED")
    expect(state.transactions).toHaveLength(0)
  })

  it("posts ADJUSTMENT without inventory Finance", async () => {
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(true)
    const initial = doc({
      docType: "ADJUSTMENT",
      status: "CONFIRMED",
      fromLocId: "branch-from",
      lines: [
        {
          id: "l1",
          documentId: "doc-1",
          productId: "p1",
          qty: 5,
          endingQty: null,
          reviewPostingDelta: 5,
        },
      ],
    })
    const { state } = setupTx(initial)

    await postDocument({ documentId: "doc-1", postedByStaffId: "staff-1" })

    expect(postStockDocumentVoucher).not.toHaveBeenCalled()
    expect(state.transactions).toHaveLength(0)
  })
})
