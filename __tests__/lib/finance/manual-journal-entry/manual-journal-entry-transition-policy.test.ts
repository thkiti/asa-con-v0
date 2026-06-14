import type { ManualJournalEntryStatus } from "@/generated/prisma/client"
import {
  ManualJournalEntryErrorCodes,
  ManualJournalEntryPolicyError,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"
import {
  assertTransitionAllowed,
  isImmutableStatus,
  isTerminalStatus,
  targetStatusForAction,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-transition-policy"
import type { ManualJournalWorkflowAction } from "@/lib/finance/manual-journal-entry/manual-journal-entry-types"

function assertAllowed(
  fromStatus: ManualJournalEntryStatus,
  action: ManualJournalWorkflowAction
) {
  expect(() =>
    assertTransitionAllowed({ fromStatus, action })
  ).not.toThrow()
}

function assertForbidden(
  fromStatus: ManualJournalEntryStatus,
  action: ManualJournalWorkflowAction,
  code?: string
) {
  expect(() =>
    assertTransitionAllowed({ fromStatus, action })
  ).toThrow(ManualJournalEntryPolicyError)
  if (code) {
    expect(() =>
      assertTransitionAllowed({ fromStatus, action })
    ).toThrow(expect.objectContaining({ code }))
  }
}

describe("manual-journal-entry-transition-policy", () => {
  describe("terminal statuses", () => {
    it.each<ManualJournalEntryStatus>(["POSTED", "CANCELLED"])(
      "treats %s as terminal and immutable",
      (status) => {
        expect(isTerminalStatus(status)).toBe(true)
        expect(isImmutableStatus(status)).toBe(true)
      }
    )

    it("non-terminal statuses are not immutable", () => {
      for (const status of ["DRAFT", "SUBMITTED", "CONFIRMED"] as const) {
        expect(isTerminalStatus(status)).toBe(false)
        expect(isImmutableStatus(status)).toBe(false)
      }
    })
  })

  describe("allowed workflow edges", () => {
    it("DRAFT -> SUBMITTED via SUBMIT", () => {
      assertAllowed("DRAFT", "SUBMIT")
      expect(targetStatusForAction("SUBMIT", "DRAFT")).toBe("SUBMITTED")
    })

    it("SUBMITTED -> CONFIRMED via CONFIRM", () => {
      assertAllowed("SUBMITTED", "CONFIRM")
      expect(targetStatusForAction("CONFIRM", "SUBMITTED")).toBe("CONFIRMED")
    })

    it("SUBMITTED -> CANCELLED via CANCEL", () => {
      assertAllowed("SUBMITTED", "CANCEL")
      expect(targetStatusForAction("CANCEL", "SUBMITTED")).toBe("CANCELLED")
    })

    it("CONFIRMED -> POSTED via POST", () => {
      assertAllowed("CONFIRMED", "POST")
      expect(targetStatusForAction("POST", "CONFIRMED")).toBe("POSTED")
    })

    it("CONFIRMED -> CANCELLED via CANCEL", () => {
      assertAllowed("CONFIRMED", "CANCEL")
      expect(targetStatusForAction("CANCEL", "CONFIRMED")).toBe("CANCELLED")
    })
  })

  describe("invalid transitions", () => {
    it("rejects SUBMIT from non-DRAFT", () => {
      assertForbidden("SUBMITTED", "SUBMIT", ManualJournalEntryErrorCodes.INVALID_TRANSITION)
      assertForbidden("CONFIRMED", "SUBMIT", ManualJournalEntryErrorCodes.INVALID_TRANSITION)
    })

    it("rejects CONFIRM from DRAFT or CONFIRMED", () => {
      assertForbidden("DRAFT", "CONFIRM")
      assertForbidden("CONFIRMED", "CONFIRM")
    })

    it("rejects POST from SUBMITTED or DRAFT", () => {
      assertForbidden("DRAFT", "POST")
      assertForbidden("SUBMITTED", "POST")
    })

    it("rejects CANCEL from DRAFT", () => {
      assertForbidden("DRAFT", "CANCEL")
    })

    it("rejects any action from POSTED or CANCELLED with IMMUTABLE_ENTRY", () => {
      for (const action of ["SUBMIT", "CONFIRM", "POST", "CANCEL"] as const) {
        assertForbidden("POSTED", action, ManualJournalEntryErrorCodes.IMMUTABLE_ENTRY)
        assertForbidden("CANCELLED", action, ManualJournalEntryErrorCodes.IMMUTABLE_ENTRY)
      }
    })
  })
})
