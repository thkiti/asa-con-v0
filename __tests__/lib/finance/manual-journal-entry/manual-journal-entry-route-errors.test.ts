import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
  ManualJournalEntryPolicyError,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"
import { mapManualJournalEntryRouteError } from "@/lib/finance/manual-journal-entry/manual-journal-entry-route-errors"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { PeriodAdminAuthError } from "@/lib/auth"

describe("mapManualJournalEntryRouteError", () => {
  it("maps ENTRY_NOT_FOUND to 404", () => {
    const mapped = mapManualJournalEntryRouteError(
      new ManualJournalEntryError(
        "not found",
        ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
        404
      )
    )
    expect(mapped).toEqual({
      status: 404,
      body: { error: "not found", code: "ENTRY_NOT_FOUND" },
    })
  })

  it("maps INVALID_TRANSITION to 409", () => {
    const mapped = mapManualJournalEntryRouteError(
      new ManualJournalEntryPolicyError("bad transition")
    )
    expect(mapped).toEqual({
      status: 409,
      body: { error: "bad transition", code: "INVALID_TRANSITION" },
    })
  })

  it("maps IMMUTABLE_ENTRY to 409", () => {
    const mapped = mapManualJournalEntryRouteError(
      new ManualJournalEntryError(
        "immutable",
        ManualJournalEntryErrorCodes.IMMUTABLE_ENTRY
      )
    )
    expect(mapped?.status).toBe(409)
    expect(mapped?.body.code).toBe("IMMUTABLE_ENTRY")
  })

  it("maps NOT_DRAFT to 409", () => {
    const mapped = mapManualJournalEntryRouteError(
      new ManualJournalEntryError(
        "not draft",
        ManualJournalEntryErrorCodes.NOT_DRAFT
      )
    )
    expect(mapped?.status).toBe(409)
  })

  it("maps validation errors to 400", () => {
    for (const code of [
      ManualJournalEntryErrorCodes.INSUFFICIENT_LINES,
      ManualJournalEntryErrorCodes.UNBALANCED_ENTRY,
      ManualJournalEntryErrorCodes.INVALID_LINE,
      ManualJournalEntryErrorCodes.ACCOUNT_NOT_FOUND,
      ManualJournalEntryErrorCodes.ACCOUNT_INACTIVE,
    ]) {
      const mapped = mapManualJournalEntryRouteError(
        new ManualJournalEntryError("validation", code)
      )
      expect(mapped?.status).toBe(400)
      expect(mapped?.body.code).toBe(code)
    }
  })

  it("maps FinancePostingError PERIOD_CLOSED to 409", () => {
    const mapped = mapManualJournalEntryRouteError(
      new FinancePostingError("closed", "PERIOD_CLOSED")
    )
    expect(mapped).toEqual({
      status: 409,
      body: { error: "closed", code: "PERIOD_CLOSED" },
    })
  })

  it("maps FinancePostingError PERIOD_NOT_OPENED to 409", () => {
    const mapped = mapManualJournalEntryRouteError(
      new FinancePostingError("not opened", "PERIOD_NOT_OPENED")
    )
    expect(mapped?.status).toBe(409)
  })

  it("maps PeriodAdminAuthError to auth status", () => {
    const mapped = mapManualJournalEntryRouteError(
      new PeriodAdminAuthError("forbidden", "FORBIDDEN", 403)
    )
    expect(mapped?.status).toBe(403)
    expect(mapped?.body.code).toBe("FORBIDDEN")
  })

  it("returns null for unknown errors", () => {
    expect(mapManualJournalEntryRouteError(new Error("boom"))).toBeNull()
  })
})
