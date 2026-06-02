import type { StockDocumentWithLines } from "@/lib/stock/posting-types"
import { DocumentError } from "@/lib/stock/document/document-errors"
import {
  applyCancelledTransition,
  applyConfirmedTransition,
  applyPostedTransition,
  applySubmittedTransition,
  deleteDraftDocument,
} from "@/lib/stock/document/document-status"
import { createPostingMockTx } from "../posting/mock-posting-tx"

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
    cancelledAt: null,
    cancelledByStaffId: null,
    cancelReason: null,
    createdAt: new Date("2026-01-01"),
    lines: [],
    ...partial,
  }
}

describe("document-status", () => {
  describe("applyPostedTransition", () => {
    it("sets POSTED and posted audit fields", async () => {
      const initial = doc({
        docType: "TRANSFER_OUT",
        status: "CONFIRMED",
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
      const { tx, getDocument } = createPostingMockTx(initial)

      const updated = await applyPostedTransition(tx, {
        documentId: "doc-1",
        postedByStaffId: "staff-post",
        priorStatus: "CONFIRMED",
        confirmedAt: new Date("2026-01-10"),
        confirmedByStaffId: "staff-confirm",
      })

      expect(updated.status).toBe("POSTED")
      expect(updated.postedByStaffId).toBe("staff-post")
      expect(updated.postedAt).toBeInstanceOf(Date)
      expect(getDocument().status).toBe("POSTED")
    })

    it("applies implicit confirm when posting from SUBMITTED without confirm", async () => {
      const initial = doc({ docType: "ADJUSTMENT", status: "SUBMITTED" })
      const { tx, getDocument } = createPostingMockTx(initial)

      await applyPostedTransition(tx, {
        documentId: "doc-1",
        postedByStaffId: "staff-post",
        priorStatus: "SUBMITTED",
        confirmedAt: null,
        confirmedByStaffId: null,
      })

      const current = getDocument()
      expect(current.status).toBe("POSTED")
      expect(current.confirmedAt).toBeInstanceOf(Date)
      expect(current.confirmedByStaffId).toBe("staff-post")
    })

    it("rejects POST from DRAFT via policy", async () => {
      const initial = doc({ docType: "TRANSFER_OUT", status: "DRAFT" })
      const { tx } = createPostingMockTx(initial)

      await expect(
        applyPostedTransition(tx, {
          documentId: "doc-1",
          postedByStaffId: "staff-1",
          priorStatus: "DRAFT",
          confirmedAt: null,
          confirmedByStaffId: null,
        })
      ).rejects.toThrow(DocumentError)
    })
  })

  describe("applyCancelledTransition", () => {
    it("sets CANCELLED and cancel audit fields", async () => {
      const initial = doc({ docType: "PURCHASE", status: "SUBMITTED" })
      const { tx, getDocument } = createPostingMockTx(initial)

      const updated = await applyCancelledTransition(tx, {
        documentId: "doc-1",
        cancelledByStaffId: "staff-cancel",
        cancelReason: "duplicate order",
      })

      expect(updated.status).toBe("CANCELLED")
      expect(updated.cancelledByStaffId).toBe("staff-cancel")
      expect(updated.cancelReason).toBe("duplicate order")
      expect(updated.cancelledAt).toBeInstanceOf(Date)
      expect(getDocument().status).toBe("CANCELLED")
    })

    it("rejects cancel when POSTED", async () => {
      const initial = doc({ docType: "TRANSFER_OUT", status: "POSTED" })
      const { tx } = createPostingMockTx(initial)

      await expect(
        applyCancelledTransition(tx, {
          documentId: "doc-1",
          cancelledByStaffId: "staff-1",
        })
      ).rejects.toMatchObject({ code: "IMMUTABLE_DOCUMENT" })
    })
  })

  describe("applySubmittedTransition", () => {
    it("sets SUBMITTED and submittedAt", async () => {
      const initial = doc({ docType: "PERFORMANCE", status: "DRAFT" })
      const { tx, getDocument } = createPostingMockTx(initial)

      const updated = await applySubmittedTransition(tx, { documentId: "doc-1" })

      expect(updated.status).toBe("SUBMITTED")
      expect(updated.submittedAt).toBeInstanceOf(Date)
      expect(getDocument().status).toBe("SUBMITTED")
    })
  })

  describe("applyConfirmedTransition", () => {
    it("sets CONFIRMED and confirm audit fields", async () => {
      const initial = doc({
        docType: "ADJUSTMENT",
        status: "SUBMITTED",
        submittedAt: new Date("2026-01-10"),
      })
      const { tx, getDocument } = createPostingMockTx(initial)

      const updated = await applyConfirmedTransition(tx, {
        documentId: "doc-1",
        confirmedByStaffId: "staff-confirm",
      })

      expect(updated.status).toBe("CONFIRMED")
      expect(updated.confirmedByStaffId).toBe("staff-confirm")
      expect(updated.confirmedAt).toBeInstanceOf(Date)
      expect(getDocument().status).toBe("CONFIRMED")
    })
  })

  describe("deleteDraftDocument", () => {
    it("deletes DRAFT document", async () => {
      const initial = doc({ docType: "ADJUSTMENT", status: "DRAFT" })
      const { tx, getDocument } = createPostingMockTx(initial)

      await deleteDraftDocument(tx, { documentId: "doc-1" })

      expect(() => getDocument()).toThrow("document deleted")
    })

    it("rejects delete when SUBMITTED", async () => {
      const initial = doc({ docType: "TRANSFER_OUT", status: "SUBMITTED" })
      const { tx } = createPostingMockTx(initial)

      await expect(
        deleteDraftDocument(tx, { documentId: "doc-1" })
      ).rejects.toMatchObject({ code: "IMMUTABLE_DOCUMENT" })
    })
  })
})
