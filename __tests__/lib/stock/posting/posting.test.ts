import { postDocument } from "@/lib/stock/posting"
import { PostingError } from "@/lib/stock/posting-errors"
import type { StockDocumentWithLines } from "@/lib/stock/posting-types"
import { createPostingMockTx } from "./mock-posting-tx"

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}))

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
  })

  it("posts TRANSFER_OUT with issueStock and sets POSTED atomically", async () => {
    const initial = doc({
      docType: "TRANSFER_OUT",
      status: "CONFIRMED",
      lines: [
        { id: "l1", documentId: "doc-1", productId: "p1", qty: 2, endingQty: null, reviewPostingDelta: null },
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
    expect(result.ledger.issue.applied).toBe(1)
    expect(result.ledger.receive.applied).toBe(0)
    expect(state.transactions).toHaveLength(1)
    expect(state.transactions[0].qtyOut).toBe(2)
    expect(getDocument().status).toBe("POSTED")
  })

  it("posts ADJ all-zero without ledger rows", async () => {
    const initial = doc({
      docType: "ADJUSTMENT",
      status: "CONFIRMED",
      fromLocId: "branch-from",
      lines: [
        { id: "l1", documentId: "doc-1", productId: "p1", qty: 0, endingQty: 5, reviewPostingDelta: 0 },
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
    expect(result.ledger.issue.applied).toBe(0)
    expect(result.ledger.receive.applied).toBe(0)
  })

  it("posts ADJ mixed deltas with both receive and issue", async () => {
    const initial = doc({
      docType: "ADJUSTMENT",
      status: "SUBMITTED",
      fromLocId: "branch-from",
      lines: [
        { id: "l1", documentId: "doc-1", productId: "p1", qty: 0, endingQty: 5, reviewPostingDelta: 2 },
        { id: "l2", documentId: "doc-1", productId: "p2", qty: 0, endingQty: 5, reviewPostingDelta: -1 },
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

    expect(result.ledger.receive.applied).toBe(1)
    expect(result.ledger.issue.applied).toBe(1)
    expect(state.transactions).toHaveLength(2)
    expect(result.document.confirmedAt).toBeInstanceOf(Date)
  })

  it("rejects already POSTED before ledger writes", async () => {
    const initial = doc({
      docType: "TRANSFER_OUT",
      status: "POSTED",
      lines: [
        { id: "l1", documentId: "doc-1", productId: "p1", qty: 2, endingQty: null, reviewPostingDelta: null },
      ],
    })
    const { tx, state } = createPostingMockTx(initial)
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    await expect(
      postDocument({ documentId: "doc-1", postedByStaffId: "staff-1" })
    ).rejects.toMatchObject({ code: "ALREADY_POSTED" })

    expect(state.transactions).toHaveLength(0)
    expect(state.stocks.size).toBe(0)
  })

  it("joins caller tx without opening prisma.$transaction", async () => {
    const initial = doc({
      docType: "PURCHASE",
      status: "RECEIVED",
      lines: [
        { id: "l1", documentId: "doc-1", productId: "p1", qty: 3, endingQty: null, reviewPostingDelta: null },
      ],
    })
    const { tx } = createPostingMockTx(initial)

    await postDocument({
      documentId: "doc-1",
      postedByStaffId: "staff-1",
      tx,
    })

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})