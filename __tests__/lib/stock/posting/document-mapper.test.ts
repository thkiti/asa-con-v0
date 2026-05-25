import { mapDocumentToLedgerMoves } from "@/lib/stock/document-mapper"
import type { StockDocumentWithLines } from "@/lib/stock/posting-types"

function doc(
  partial: Partial<StockDocumentWithLines> & Pick<StockDocumentWithLines, "docType">
): StockDocumentWithLines {
  return {
    id: "doc-1",
    refNo: "REF-1",
    status: "CONFIRMED",
    date: new Date("2026-01-15"),
    branchId: "branch-owner",
    periodMonth: "202601",
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

describe("mapDocumentToLedgerMoves", () => {
  it("maps TRANSFER_OUT to outbound issueStock items at fromLocId", () => {
    const mapped = mapDocumentToLedgerMoves(
      doc({
        docType: "TRANSFER_OUT",
        lines: [
          { id: "l1", documentId: "doc-1", productId: "p1", qty: 5, endingQty: null, reviewPostingDelta: null },
        ],
      })
    )

    expect(mapped.branchId).toBe("branch-from")
    expect(mapped.refType).toBe("STOCK_DOC_TRANSFER_OUT")
    expect(mapped.outbound).toEqual([{ productId: "p1", qty: 5, lineId: "l1" }])
    expect(mapped.inbound).toEqual([])
  })

  it("maps PURCHASE to inbound receiveStock items at toLocId", () => {
    const mapped = mapDocumentToLedgerMoves(
      doc({
        docType: "PURCHASE",
        status: "RECEIVED",
        lines: [
          { id: "l1", documentId: "doc-1", productId: "p1", qty: -3, endingQty: null, reviewPostingDelta: null },
        ],
      })
    )

    expect(mapped.branchId).toBe("branch-to")
    expect(mapped.inbound).toEqual([{ productId: "p1", qty: 3, lineId: "l1" }])
    expect(mapped.outbound).toEqual([])
  })

  it("maps ADJUSTMENT deltas by sign without signed qty convention", () => {
    const mapped = mapDocumentToLedgerMoves(
      doc({
        docType: "ADJUSTMENT",
        fromLocId: "branch-adj",
        lines: [
          { id: "l1", documentId: "doc-1", productId: "p1", qty: 0, endingQty: 10, reviewPostingDelta: 3 },
          { id: "l2", documentId: "doc-1", productId: "p2", qty: 0, endingQty: 10, reviewPostingDelta: -2 },
          { id: "l3", documentId: "doc-1", productId: "p3", qty: 0, endingQty: 10, reviewPostingDelta: 0 },
        ],
      })
    )

    expect(mapped.inbound).toEqual([{ productId: "p1", qty: 3, lineId: "l1" }])
    expect(mapped.outbound).toEqual([{ productId: "p2", qty: 2, lineId: "l2" }])
  })

  it("maps PERFORMANCE as outbound-only", () => {
    const mapped = mapDocumentToLedgerMoves(
      doc({
        docType: "PERFORMANCE",
        lines: [
          { id: "l1", documentId: "doc-1", productId: "p1", qty: 4, endingQty: null, reviewPostingDelta: null },
        ],
      })
    )

    expect(mapped.branchId).toBe("branch-from")
    expect(mapped.outbound).toHaveLength(1)
    expect(mapped.inbound).toEqual([])
  })
})