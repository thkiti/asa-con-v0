import type { StockDocumentWithLines } from "@/lib/stock/posting-types"
import { DocumentErrorCodes } from "@/lib/stock/document/document-errors"
import { saveDocument } from "@/lib/stock/document/document-save"
import { createDocumentMockTx } from "./mock-document-tx"

function draftDoc(
  partial: Partial<StockDocumentWithLines> & Pick<StockDocumentWithLines, "docType">
): StockDocumentWithLines {
  return {
    id: "doc-1",
    refNo: "REF-1",
    status: "DRAFT",
    date: new Date("2026-01-15"),
    branchId: "branch-shop",
    periodMonth: "2026-01",
    fromLocId: "branch-shop",
    toLocId: "branch-ho",
    submittedAt: null,
    confirmedAt: null,
    postedAt: null,
    createdByStaffId: null,
    confirmedByStaffId: null,
    postedByStaffId: null,
    cancelledAt: null,
    cancelledByStaffId: null,
    cancelReason: null,
    createdAt: new Date("2026-01-01"),
    lines: [],
    ...partial,
  }
}

describe("saveDocument", () => {
  it("saves a valid new draft", async () => {
    const { tx, getDocument } = createDocumentMockTx(undefined, [
      { id: "branch-shop", type: "SH", isActive: true, deleted: false },
      { id: "branch-ho", type: "HO", isActive: true, deleted: false },
    ])

    const saved = await saveDocument({
      docType: "TRANSFER_OUT",
      date: "2026-02-01",
      branchId: "branch-shop",
      fromLocId: "branch-shop",
      toLocId: "branch-ho",
      lines: [{ productId: "p1", qty: 2 }],
      tx,
    })

    expect(saved.status).toBe("DRAFT")
    expect(saved.lines).toHaveLength(1)
    expect(saved.lines[0].qty).toBe(2)
    expect(getDocument().status).toBe("DRAFT")
  })

  it("rejects empty document", async () => {
    const { tx } = createDocumentMockTx()

    await expect(
      saveDocument({
        docType: "PERFORMANCE",
        date: "2026-02-01",
        branchId: "branch-shop",
        fromLocId: "branch-shop",
        lines: [],
        tx,
      })
    ).rejects.toMatchObject({ code: DocumentErrorCodes.EMPTY_DOCUMENT })
  })

  it("removes qty=0 lines", async () => {
    const { tx } = createDocumentMockTx(undefined, [
      { id: "branch-shop", type: "SH", isActive: true, deleted: false },
      { id: "branch-ho", type: "HO", isActive: true, deleted: false },
    ])

    const saved = await saveDocument({
      docType: "TRANSFER_OUT",
      date: "2026-02-01",
      branchId: "branch-shop",
      fromLocId: "branch-shop",
      toLocId: "branch-ho",
      lines: [
        { productId: "p1", qty: 0 },
        { productId: "p2", qty: 3 },
      ],
      tx,
    })

    expect(saved.lines).toHaveLength(1)
    expect(saved.lines[0].productId).toBe("p2")
  })

  it("rejects invalid qty on PURCHASE", async () => {
    const { tx } = createDocumentMockTx()

    await expect(
      saveDocument({
        docType: "PURCHASE",
        date: "2026-02-01",
        branchId: "branch-ho",
        toLocId: "branch-ho",
        lines: [{ productId: "p1", qty: -1 }],
        tx,
      })
    ).rejects.toMatchObject({ code: DocumentErrorCodes.INVALID_QUANTITY })
  })

  it("rejects save on immutable status", async () => {
    const initial = draftDoc({
      docType: "PERFORMANCE",
      status: "POSTED",
      fromLocId: "branch-shop",
      toLocId: null,
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
    const { tx } = createDocumentMockTx(initial, [
      { id: "branch-shop", code: "SH001", type: "SH", isActive: true, deleted: false },
    ])

    await expect(
      saveDocument({
        id: "doc-1",
        docType: "PERFORMANCE",
        date: "2026-02-01",
        branchId: "branch-shop",
        fromLocId: "branch-shop",
        legalEntityCode: "AS",
        lines: [{ productId: "p1", qty: 1 }],
        tx,
      })
    ).rejects.toMatchObject({ code: DocumentErrorCodes.DOCUMENT_IMMUTABLE })
  })

  it("rejects missing productId", async () => {
    const { tx } = createDocumentMockTx()

    await expect(
      saveDocument({
        docType: "PERFORMANCE",
        date: "2026-02-01",
        branchId: "branch-shop",
        fromLocId: "branch-shop",
        lines: [{ productId: "", qty: 1 }],
        tx,
      })
    ).rejects.toMatchObject({ code: DocumentErrorCodes.INVALID_PRODUCT })
  })

  it("updates an existing DRAFT and replaces lines", async () => {
    const initial = draftDoc({
      docType: "PERFORMANCE",
      lines: [
        {
          id: "l-old",
          documentId: "doc-1",
          productId: "p-old",
          qty: 5,
          endingQty: null,
          reviewPostingDelta: null,
        },
      ],
    })
    const { tx, getDocument } = createDocumentMockTx(initial, [
      { id: "branch-shop", code: "SH001", type: "SH", isActive: true, deleted: false },
    ])

    const saved = await saveDocument({
      id: "doc-1",
      docType: "PERFORMANCE",
      date: "2026-03-01",
      branchId: "branch-shop",
      fromLocId: "branch-shop",
      legalEntityCode: "AS",
      lines: [{ productId: "p-new", qty: 1 }],
      tx,
    })

    expect(saved.lines).toHaveLength(1)
    expect(saved.lines[0].productId).toBe("p-new")
    expect(saved.periodMonth).toBe("2026-03")
    expect(getDocument().status).toBe("DRAFT")
  })

  it("persists reviewPostingDelta on ADJUSTMENT opening-count lines", async () => {
    const { tx, getDocument } = createDocumentMockTx(undefined, [
      { id: "branch-shop", code: "SH001", type: "SH", isActive: true, deleted: false },
    ])

    const saved = await saveDocument({
      docType: "ADJUSTMENT",
      date: "2026-06-10",
      branchId: "branch-shop",
      fromLocId: "branch-shop",
      legalEntityCode: "AS",
      lines: [{ productId: "p1", qty: 100, endingQty: 100, reviewPostingDelta: 100 }],
      tx,
    })

    expect(saved.lines).toHaveLength(1)
    expect(saved.lines[0]).toMatchObject({
      productId: "p1",
      qty: 100,
      reviewPostingDelta: 100,
    })
    expect(getDocument().lines[0]?.reviewPostingDelta).toBe(100)
  })

  it("rejects invalid HO↔HO transfer route", async () => {
    const { tx } = createDocumentMockTx(undefined, [
      { id: "ho-1", code: "HO999", type: "HO", isActive: true, deleted: false },
      { id: "ho-2", code: "HO998", type: "HO", isActive: true, deleted: false },
    ])

    await expect(
      saveDocument({
        docType: "TRANSFER_OUT",
        date: "2026-02-01",
        branchId: "ho-1",
        fromLocId: "ho-1",
        toLocId: "ho-2",
        legalEntityCode: "AD",
        lines: [{ productId: "p1", qty: 1 }],
        tx,
      })
    ).rejects.toMatchObject({ code: DocumentErrorCodes.INVALID_TRANSFER_ROUTE })
  })
})
