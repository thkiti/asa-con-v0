import { DocumentErrorCodes } from "@/lib/stock/document/document-errors"
import {
  assertCanReadDocument,
  resolveListBranchId,
  StockDocumentAuthError,
} from "@/lib/stock/document-read/document-access"
import type { SessionUser } from "@/lib/auth/types"

function session(partial: Partial<SessionUser> & Pick<SessionUser, "role">): SessionUser {
  return {
    sessionId: "s1",
    staffId: "staff-1",
    name: "Test",
    branchId: "branch-shop",
    ...partial,
  }
}

describe("document-access", () => {
  describe("resolveListBranchId", () => {
    it("pins shop staff to session branch", () => {
      expect(
        resolveListBranchId(session({ role: "SH_STAFF", branchId: "branch-shop" }), null)
      ).toBe("branch-shop")
    })

    it("rejects shop staff requesting another branch", () => {
      expect(() =>
        resolveListBranchId(session({ role: "SH_STAFF" }), "branch-other")
      ).toThrow(StockDocumentAuthError)
    })

    it("requires branchId for HO without session branch", () => {
      expect(() =>
        resolveListBranchId(session({ role: "HO_FINANCE", branchId: "" }), null)
      ).toThrow(expect.objectContaining({ code: "BRANCH_ACCESS_DENIED" }))
    })
  })

  describe("assertCanReadDocument", () => {
    const doc = {
      branchId: "branch-shop",
      fromLocId: "branch-shop",
      toLocId: "branch-ho",
      docType: "TRANSFER_OUT" as const,
    }

    it("allows shop staff for shop doc types touching branch", () => {
      expect(() =>
        assertCanReadDocument(session({ role: "SH_STAFF" }), doc)
      ).not.toThrow()
    })

    it("hides non-shop doc types from shop staff", () => {
      expect(() =>
        assertCanReadDocument(session({ role: "SH_STAFF" }), {
          ...doc,
          docType: "PURCHASE",
        })
      ).toThrow(expect.objectContaining({ code: DocumentErrorCodes.DOCUMENT_NOT_FOUND }))
    })
  })
})
