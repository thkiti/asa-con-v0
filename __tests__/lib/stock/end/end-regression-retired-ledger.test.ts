import { applyIssueItem } from "@/lib/stock/issue-stock"
import { StockLedgerError } from "@/lib/stock/stock-errors"
import { postDocument } from "@/lib/stock/posting"
import type { StockDocumentWithLines } from "@/lib/stock/posting-types"
import { createPostingMockTx } from "../posting/mock-posting-tx"
import { POSTABLE_BY_DOC_TYPE } from "@/lib/stock/document/document-transition-policy"

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
  partial: Partial<StockDocumentWithLines> &
    Pick<StockDocumentWithLines, "docType" | "status">
): StockDocumentWithLines {
  return {
    id: "doc-1",
    refNo: "REF-1",
    date: new Date("2026-01-15"),
    branchId: "branch-owner",
    periodMonth: "2026-01",
    fromLocId: "branch-from",
    toLocId: "branch-to",
    submittedAt: null,
    confirmedAt: null,
    postedAt: null,
    createdByStaffId: null,
    confirmedByStaffId: null,
    postedByStaffId: null,
    createdAt: new Date("2026-01-01"),
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
    ...partial,
  }
}

describe("END regression — retired ledger", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(isFinancePostingEnabled as jest.Mock).mockReturnValue(false)
    ;(postStockDocumentVoucher as jest.Mock).mockResolvedValue({
      voucherId: "v-1",
      alreadyPosted: false,
    })
  })

  it("issueStock still throws PER_EVENT_LEDGER_RETIRED", async () => {
    await expect(
      applyIssueItem(
        {} as never,
        {
          branchId: "branch-1",
          refType: "POS_SALE",
          refId: "sale-1",
          documentId: null,
          date: new Date("2026-01-15"),
        },
        { productId: "product-1", qty: 2 }
      )
    ).rejects.toMatchObject({
      code: "PER_EVENT_LEDGER_RETIRED",
      name: "StockLedgerError",
    })
    await expect(
      applyIssueItem(
        {} as never,
        {
          branchId: "b",
          refType: "X",
          refId: "r",
          documentId: null,
          date: new Date(),
        },
        { productId: "p", qty: 1 }
      )
    ).rejects.toBeInstanceOf(StockLedgerError)
  })

  it("postDocument creates no StockTransaction rows", async () => {
    const initial = doc({
      docType: "ADJUSTMENT",
      status: "CONFIRMED",
      lines: [
        {
          id: "l1",
          documentId: "doc-1",
          productId: "p1",
          qty: 2,
          endingQty: 10,
          reviewPostingDelta: -1,
        },
      ],
    })
    const { tx, state, getDocument } = createPostingMockTx(initial)
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    await postDocument({
      documentId: "doc-1",
      postedByStaffId: "staff-1",
    })

    expect(getDocument()?.status).toBe("POSTED")
    expect(state.transactions).toHaveLength(0)
  })

  it("END has empty POSTABLE set", () => {
    expect([...POSTABLE_BY_DOC_TYPE.END]).toEqual([])
  })
})
