import { assertCanPost } from "@/lib/stock/validation"
import { PostingError } from "@/lib/stock/posting-errors"
import type { StockDocumentWithLines } from "@/lib/stock/posting-types"

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
    lines: [
      { id: "l1", documentId: "doc-1", productId: "p1", qty: 1, endingQty: null, reviewPostingDelta: null },
    ],
    ...partial,
  }
}

describe("assertCanPost", () => {
  it("rejects missing document", () => {
    expect(() => assertCanPost(null)).toThrow(PostingError)
    expect(() => assertCanPost(null)).toThrow(expect.objectContaining({ code: "NOT_FOUND" }))
  })

  it("rejects already POSTED", () => {
    expect(() =>
      assertCanPost(doc({ docType: "TRANSFER_OUT", status: "POSTED" }))
    ).toThrow(expect.objectContaining({ code: "ALREADY_POSTED" }))
  })

  it("rejects DRAFT for TRANSFER_OUT", () => {
    expect(() =>
      assertCanPost(doc({ docType: "TRANSFER_OUT", status: "DRAFT" }))
    ).toThrow(expect.objectContaining({ code: "INVALID_STATUS" }))
  })

  it("allows PURCHASE from RECEIVED", () => {
    expect(() =>
      assertCanPost(doc({ docType: "PURCHASE", status: "RECEIVED" }))
    ).not.toThrow()
  })

  it("allows ADJUSTMENT all-zero deltas when reviewPostingDelta present", () => {
    expect(() =>
      assertCanPost(
        doc({
          docType: "ADJUSTMENT",
          status: "CONFIRMED",
          fromLocId: "branch-from",
          lines: [
            { id: "l1", documentId: "doc-1", productId: "p1", qty: 0, endingQty: 5, reviewPostingDelta: 0 },
          ],
        })
      )
    ).not.toThrow()
  })

  it("rejects ADJUSTMENT when reviewPostingDelta missing", () => {
    expect(() =>
      assertCanPost(
        doc({
          docType: "ADJUSTMENT",
          status: "CONFIRMED",
          lines: [
            { id: "l1", documentId: "doc-1", productId: "p1", qty: 0, endingQty: 5, reviewPostingDelta: null },
          ],
        })
      )
    ).toThrow(expect.objectContaining({ code: "MISSING_ADJ_DELTA" }))
  })
})