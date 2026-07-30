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
    userId: "u1",
    staffId: "staff-1",
    name: "Test",
    branchId: "branch-shop",
    branchCode: "SH001",
    branchName: "Shop",
    documentEntityCode: "AS",
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
    const shopDoc = {
      branchId: "branch-shop",
      fromLocId: "branch-shop",
      toLocId: "branch-ho",
      docType: "TRANSFER_OUT" as const,
      legalEntityCode: "AS",
    }

    const hoSession = session({
      role: "HO_OPERATIONS",
      branchId: "branch-ho",
      branchCode: "HO999",
      branchName: "Head Office",
      documentEntityCode: "AS",
    })

    it("allows shop staff for shop doc types touching branch", () => {
      expect(() =>
        assertCanReadDocument(session({ role: "SH_STAFF" }), shopDoc)
      ).not.toThrow()
    })

    it("hides non-shop doc types from shop staff", () => {
      expect(() =>
        assertCanReadDocument(session({ role: "SH_STAFF" }), {
          ...shopDoc,
          docType: "PURCHASE",
        })
      ).toThrow(expect.objectContaining({ code: DocumentErrorCodes.DOCUMENT_NOT_FOUND }))
    })

    it.each([
      ["ORD", "TRANSFER_OUT" as const],
      ["CNT", "ADJUSTMENT" as const],
      ["ADJ", "ADJUSTMENT" as const],
      ["PER", "PERFORMANCE" as const],
      ["END", "END" as const],
    ])(
      "allows HO ASAS session to open shop %s without requiring HO999 touch",
      (_kind, docType) => {
        expect(() =>
          assertCanReadDocument(hoSession, {
            branchId: "branch-shop",
            fromLocId: "branch-shop",
            toLocId: null,
            docType,
            legalEntityCode: "AS",
          })
        ).not.toThrow()
      }
    )

    it("rejects HO ASAS session reading ASAD document", () => {
      expect(() =>
        assertCanReadDocument(hoSession, {
          ...shopDoc,
          branchId: "branch-ho",
          fromLocId: "branch-ho",
          legalEntityCode: "AD",
          docType: "ADJUSTMENT",
        })
      ).toThrow(expect.objectContaining({ code: DocumentErrorCodes.DOCUMENT_NOT_FOUND }))
    })

    it("allows HO ASAD session to open HO-scoped AD document", () => {
      expect(() =>
        assertCanReadDocument(
          session({
            role: "HO_OPERATIONS",
            branchId: "branch-ho",
            branchCode: "HO999",
            documentEntityCode: "AD",
          }),
          {
            branchId: "branch-ho",
            fromLocId: "branch-ho",
            toLocId: "branch-shop",
            docType: "TRANSFER_OUT",
            legalEntityCode: "AD",
          }
        )
      ).not.toThrow()
    })
  })
})
