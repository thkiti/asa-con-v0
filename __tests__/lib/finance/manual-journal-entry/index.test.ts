import * as ManualJournalEntryModule from "@/lib/finance/manual-journal-entry"

describe("manual-journal-entry public API", () => {
  const expectedExports = [
    "ManualJournalEntryError",
    "ManualJournalEntryErrorCodes",
    "ManualJournalEntryPolicyError",
    "ENTRY_TYPE_DOCUMENT_CODE",
    "allocateManualJournalEntryNo",
    "buildManualJournalEntryNo",
    "calendarYearFromEntryDate",
    "countManualJournalEntriesInScope",
    "documentCodeForEntryType",
    "formatEntryYearSuffix",
    "utcRangeForBangkokCalendarYear",
    "createManualJournalEntryDraft",
    "updateManualJournalEntryDraft",
    "cancelManualJournalEntry",
    "confirmManualJournalEntry",
    "deleteDraftManualJournalEntry",
    "submitManualJournalEntry",
    "postManualJournalEntry",
    "financeRefTypeForManualJournalEntryType",
    "attachManualJournalEntryPdfFromSnapshot",
    "loadPostedManualJournalEntryPdfSnapshot",
    "buildManualJournalEntryPdfSnapshot",
    "assertCanPostManualJournalEntry",
    "assertCanSubmitManualJournalEntry",
    "assertDraftEditable",
    "assertManualJournalLineSides",
    "parseManualJournalEntryDate",
    "resolveManualJournalEntryLines",
    "applyCancelledStatus",
    "applyConfirmedStatus",
    "applyPdfSnapshot",
    "applyPostedStatus",
    "applySubmittedStatus",
    "assertTransitionAllowed",
    "isImmutableStatus",
    "isTerminalStatus",
    "targetStatusForAction",
  ] as const

  it("exports stable domain surface for later workflow steps", () => {
    for (const name of expectedExports) {
      expect(ManualJournalEntryModule[name]).toBeDefined()
    }
  })
})
