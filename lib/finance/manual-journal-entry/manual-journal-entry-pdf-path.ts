import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "./manual-journal-entry-errors"

const MANUAL_JOURNAL_PDF_PREFIX = "manual-journal"

export function assertSafeManualJournalEntryId(entryId: string): string {
  const trimmed = String(entryId ?? "").trim()
  if (!trimmed || !/^[0-9a-f-]{36}$/i.test(trimmed)) {
    throw new ManualJournalEntryError(
      "Invalid manual journal entry id for PDF storage",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }
  return trimmed
}

export function buildManualJournalPdfPathname(entryId: string): string {
  const safeId = assertSafeManualJournalEntryId(entryId)
  return `${MANUAL_JOURNAL_PDF_PREFIX}/${safeId}.pdf`
}
