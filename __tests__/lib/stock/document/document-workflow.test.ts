import type { StockDocumentWithLines } from "@/lib/stock/posting-types"
import { DocumentErrorCodes } from "@/lib/stock/document/document-errors"
import {
  confirmDocument,
  submitDocument,
} from "@/lib/stock/document/document-workflow"
import { createDocumentMockTx } from "./mock-document-tx"

function doc(
  partial: Partial<StockDocumentWithLines> & Pick<StockDocumentWithLines, "docType" | "status">
): StockDocumentWithLines {
  return {
    id: "doc-1",
    refNo: "REF-1",
    date: new Date("2026-01-15"),
    branchId: "branch-shop",
    periodMonth: "2026-01",
    fromLocId: "branch-shop",
    toLocId: null,
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

describe("submitDocument", () => {
  it("transitions DRAFT → SUBMITTED", async () => {
    const initial = doc({ docType: "PERFORMANCE", status: "DRAFT" })
    const { tx, getDocument, state } = createDocumentMockTx(initial)

    const updated = await submitDocument({ documentId: "doc-1", tx })

    expect(updated.status).toBe("SUBMITTED")
    expect(updated.submittedAt).toBeInstanceOf(Date)
    expect(getDocument().status).toBe("SUBMITTED")
    expect(state.transactions).toHaveLength(0)
  })

  it("rejects empty document", async () => {
    const initial = doc({
      docType: "PERFORMANCE",
      status: "DRAFT",
      lines: [],
    })
    const { tx } = createDocumentMockTx(initial)

    await expect(
      submitDocument({ documentId: "doc-1", tx })
    ).rejects.toMatchObject({ code: DocumentErrorCodes.EMPTY_DOCUMENT })
  })

  it("rejects immutable status", async () => {
    const initial = doc({ docType: "PERFORMANCE", status: "CANCELLED" })
    const { tx } = createDocumentMockTx(initial)

    await expect(
      submitDocument({ documentId: "doc-1", tx })
    ).rejects.toMatchObject({ code: DocumentErrorCodes.DOCUMENT_IMMUTABLE })
  })
})

describe("confirmDocument", () => {
  it("transitions SUBMITTED → CONFIRMED", async () => {
    const initial = doc({
      docType: "ADJUSTMENT",
      status: "SUBMITTED",
      submittedAt: new Date("2026-01-10"),
    })
    const { tx, getDocument, state } = createDocumentMockTx(initial)

    const updated = await confirmDocument({
      documentId: "doc-1",
      confirmedByStaffId: "staff-confirm",
      tx,
    })

    expect(updated.status).toBe("CONFIRMED")
    expect(updated.confirmedAt).toBeInstanceOf(Date)
    expect(updated.confirmedByStaffId).toBe("staff-confirm")
    expect(getDocument().status).toBe("CONFIRMED")
    expect(state.transactions).toHaveLength(0)
    expect(state.layers).toHaveLength(0)
  })

  it("rejects invalid transition from DRAFT", async () => {
    const initial = doc({ docType: "PERFORMANCE", status: "DRAFT" })
    const { tx } = createDocumentMockTx(initial)

    await expect(
      confirmDocument({
        documentId: "doc-1",
        confirmedByStaffId: "staff-1",
        tx,
      })
    ).rejects.toMatchObject({ code: DocumentErrorCodes.INVALID_DOCUMENT_STATUS })
  })

  it("rejects confirm on POSTED", async () => {
    const initial = doc({ docType: "PERFORMANCE", status: "POSTED" })
    const { tx } = createDocumentMockTx(initial)

    await expect(
      confirmDocument({
        documentId: "doc-1",
        confirmedByStaffId: "staff-1",
        tx,
      })
    ).rejects.toMatchObject({ code: DocumentErrorCodes.DOCUMENT_IMMUTABLE })
  })
})
