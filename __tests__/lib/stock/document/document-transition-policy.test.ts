import type { DocStatus, DocType } from "@/generated/prisma/client"
import { DocumentPolicyError } from "@/lib/stock/document/document-errors"
import {
  assertTransitionAllowed,
  canMutateLines,
  isImmutableStatus,
  isTerminalStatus,
  POSTABLE_BY_DOC_TYPE,
  resolveVoidAction,
  targetStatusForAction,
} from "@/lib/stock/document/document-transition-policy"
import type { DocumentWorkflowAction } from "@/lib/stock/document/document-types"

const ALL_DOC_TYPES: DocType[] = [
  "TRANSFER_OUT",
  "PERFORMANCE",
  "ADJUSTMENT",
  "PURCHASE",
  "TRANSFER_IN",
]

function assertAllowed(
  docType: DocType,
  fromStatus: DocStatus,
  action: DocumentWorkflowAction
) {
  expect(() =>
    assertTransitionAllowed({ docType, fromStatus, action })
  ).not.toThrow()
}

function assertForbidden(
  docType: DocType,
  fromStatus: DocStatus,
  action: DocumentWorkflowAction
) {
  expect(() =>
    assertTransitionAllowed({ docType, fromStatus, action })
  ).toThrow(DocumentPolicyError)
}

describe("document-transition-policy", () => {
  describe("resolveVoidAction", () => {
    it("returns DELETE for DRAFT", () => {
      expect(resolveVoidAction("DRAFT")).toBe("DELETE")
    })

    it.each<DocStatus>([
      "SUBMITTED",
      "SHIPPED",
      "CONFIRMED",
      "RECEIVED",
      "TRANSFERRED",
    ])("returns CANCEL for %s", (status) => {
      expect(resolveVoidAction(status)).toBe("CANCEL")
    })

    it.each<DocStatus>(["POSTED", "CANCELLED"])(
      "returns FORBIDDEN for %s",
      (status) => {
        expect(resolveVoidAction(status)).toBe("FORBIDDEN")
      }
    )
  })

  describe("terminal and line mutation helpers", () => {
    it("treats POSTED and CANCELLED as terminal and immutable", () => {
      for (const status of ["POSTED", "CANCELLED"] as const) {
        expect(isTerminalStatus(status)).toBe(true)
        expect(isImmutableStatus(status)).toBe(true)
        expect(canMutateLines(status)).toBe(false)
      }
    })

    it("allows line mutation only in DRAFT", () => {
      expect(canMutateLines("DRAFT")).toBe(true)
      expect(canMutateLines("SUBMITTED")).toBe(false)
    })
  })

  describe("POSTABLE_BY_DOC_TYPE", () => {
    it("matches Phase 4 postable sets", () => {
      expect([...POSTABLE_BY_DOC_TYPE.TRANSFER_OUT]).toEqual(
        expect.arrayContaining(["SUBMITTED", "CONFIRMED"])
      )
      expect([...POSTABLE_BY_DOC_TYPE.PURCHASE]).toEqual(
        expect.arrayContaining(["SUBMITTED", "CONFIRMED", "RECEIVED"])
      )
    })

    it("END is never postable", () => {
      expect([...POSTABLE_BY_DOC_TYPE.END]).toEqual([])
    })
  })

  describe("assertTransitionAllowed — POST", () => {
    it.each([
      ["TRANSFER_OUT", "SUBMITTED"],
      ["TRANSFER_OUT", "CONFIRMED"],
      ["PURCHASE", "RECEIVED"],
    ] as const)("allows POST from %s for %s", (docType, fromStatus) => {
      assertAllowed(docType, fromStatus, "POST")
      expect(targetStatusForAction("POST", fromStatus)).toBe("POSTED")
    })

    it("rejects POST from DRAFT", () => {
      assertForbidden("TRANSFER_OUT", "DRAFT", "POST")
    })

    it("rejects POST from terminal statuses", () => {
      assertForbidden("TRANSFER_OUT", "POSTED", "POST")
      assertForbidden("TRANSFER_OUT", "CANCELLED", "POST")
    })
  })

  describe("assertTransitionAllowed — workflow edges", () => {
    it("allows SUBMIT from DRAFT for all doc types", () => {
      for (const docType of ALL_DOC_TYPES) {
        assertAllowed(docType, "DRAFT", "SUBMIT")
        expect(targetStatusForAction("SUBMIT", "DRAFT")).toBe("SUBMITTED")
      }
    })

    it("allows SHIP for transfer and purchase doc types", () => {
      assertAllowed("TRANSFER_OUT", "SUBMITTED", "SHIP")
      assertAllowed("PURCHASE", "SUBMITTED", "SHIP")
      assertForbidden("ADJUSTMENT", "SUBMITTED", "SHIP")
    })

    it("allows CONFIRM from SUBMITTED for all doc types", () => {
      for (const docType of ALL_DOC_TYPES) {
        assertAllowed(docType, "SUBMITTED", "CONFIRM")
        expect(targetStatusForAction("CONFIRM", "SUBMITTED")).toBe("CONFIRMED")
      }
    })

    it("allows CANCEL from pre-posted workflow statuses", () => {
      assertAllowed("TRANSFER_OUT", "SUBMITTED", "CANCEL")
      assertAllowed("ADJUSTMENT", "TRANSFERRED", "CANCEL")
      expect(targetStatusForAction("CANCEL", "SUBMITTED")).toBe("CANCELLED")
    })

    it("rejects CANCEL from DRAFT (use DELETE_DRAFT)", () => {
      assertForbidden("TRANSFER_OUT", "DRAFT", "CANCEL")
    })

    it("rejects any action from POSTED or CANCELLED", () => {
      for (const action of ["SUBMIT", "SHIP", "POST", "CANCEL"] as const) {
        assertForbidden("TRANSFER_OUT", "POSTED", action)
        assertForbidden("TRANSFER_OUT", "CANCELLED", action)
      }
    })

    it("allows DELETE_DRAFT only from DRAFT", () => {
      assertAllowed("PURCHASE", "DRAFT", "DELETE_DRAFT")
      assertForbidden("PURCHASE", "SUBMITTED", "DELETE_DRAFT")
    })
  })
})
