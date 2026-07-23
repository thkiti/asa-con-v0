import { postDocument } from "@/lib/stock/posting"
import { PostingError } from "@/lib/stock/posting-errors"
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

describe("postDocument", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(false)
    ;(postStockDocumentVoucher as jest.Mock).mockResolvedValue({
      voucherId: "v-1",
      alreadyPosted: false,
    })
  })

  it("posts TRANSFER_OUT without StockTransaction and sets POSTED", async () => {
    const initial = doc({
      docType: "TRANSFER_OUT",
      status: "CONFIRMED",
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
    const { tx, state, getDocument } = createPostingMockTx(initial)
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    const result = await postDocument({
      documentId: "doc-1",
      postedByStaffId: "staff-1",
    })

    expect(result.document.status).toBe("POSTED")
    expect(result.document.postedByStaffId).toBe("staff-1")
    expect(result.ledger.issue.applied).toBe(0)
    expect(result.ledger.receive.applied).toBe(0)
    expect(state.transactions).toHaveLength(0)
    expect(getDocument().status).toBe("POSTED")
    expect(postStockDocumentVoucher).not.toHaveBeenCalled()
  })

  it("posts ADJUSTMENT (CNT path) without StockTransaction or inventory voucher", async () => {
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
    const { tx, state } = createPostingMockTx(initial)
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    const result = await postDocument({
      documentId: "doc-1",
      postedByStaffId: "staff-1",
    })

    expect(result.document.status).toBe("POSTED")
    expect(state.transactions).toHaveLength(0)
    expect(postStockDocumentVoucher).not.toHaveBeenCalled()
  })

  it("posts ADJ all-zero without ledger rows", async () => {
    const initial = doc({
      docType: "ADJUSTMENT",
      status: "CONFIRMED",
      fromLocId: "branch-from",
      lines: [
        {
          id: "l1",
          documentId: "doc-1",
          productId: "p1",
          qty: 0,
          endingQty: 5,
          reviewPostingDelta: 0,
        },
      ],
    })
    const { tx, state } = createPostingMockTx(initial)
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    const result = await postDocument({
      documentId: "doc-1",
      postedByStaffId: "staff-1",
    })

    expect(result.document.status).toBe("POSTED")
    expect(state.transactions).toHaveLength(0)
  })

  it("rejects already POSTED documents", async () => {
    const initial = doc({
      docType: "TRANSFER_OUT",
      status: "POSTED",
      lines: [],
    })
    const { tx } = createPostingMockTx(initial)
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    await expect(
      postDocument({ documentId: "doc-1", postedByStaffId: "staff-1" })
    ).rejects.toBeInstanceOf(PostingError)
  })

  it("retry of successful post does not create StockTransaction", async () => {
    const initial = doc({
      docType: "PERFORMANCE",
      status: "SUBMITTED",
      fromLocId: "branch-from",
      lines: [
        {
          id: "l1",
          documentId: "doc-1",
          productId: "p1",
          qty: 1,
          endingQty: null,
          reviewPostingDelta: null,
        },
      ],
    })
    const { tx, state } = createPostingMockTx(initial)
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    await postDocument({ documentId: "doc-1", postedByStaffId: "staff-1" })
    await expect(
      postDocument({ documentId: "doc-1", postedByStaffId: "staff-1" })
    ).rejects.toBeInstanceOf(PostingError)
    expect(state.transactions).toHaveLength(0)
  })
})
