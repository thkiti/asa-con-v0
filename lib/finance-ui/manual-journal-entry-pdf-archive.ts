import type { ManualJournalEntryRead } from "@/lib/finance/manual-journal-entry/manual-journal-entry-read-types"

export const LEGACY_PDF_SNAPSHOT_REPLACE_NOT_UPDATED_ERROR =
  "Archived PDF regeneration did not update the stored PDF. Please delete and regenerate."

export function verifyArchivedPdfRegenerationResult(input: {
  hadArchive: boolean
  beforePdfGeneratedAt: string | null
  afterEntry: ManualJournalEntryRead
}): string | null {
  if (!input.hadArchive) return null

  if (!input.afterEntry.pdfSnapshotReady) {
    return LEGACY_PDF_SNAPSHOT_REPLACE_NOT_UPDATED_ERROR
  }

  const afterGeneratedAt = String(input.afterEntry.pdfGeneratedAt ?? "").trim()
  if (!afterGeneratedAt) {
    return LEGACY_PDF_SNAPSHOT_REPLACE_NOT_UPDATED_ERROR
  }

  const beforeGeneratedAt = String(input.beforePdfGeneratedAt ?? "").trim()
  if (beforeGeneratedAt && afterGeneratedAt === beforeGeneratedAt) {
    return LEGACY_PDF_SNAPSHOT_REPLACE_NOT_UPDATED_ERROR
  }

  return null
}
