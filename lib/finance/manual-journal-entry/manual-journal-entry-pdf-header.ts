import { buildFinanceDocumentAuditLine } from "@/lib/finance-ui/finance-document-display"
import type { ManualJournalEntryPdfSnapshot } from "./manual-journal-entry-pdf-snapshot-types"

export type ManualJournalPdfHeaderLines = {
  auditLine: string
  description: string | null
}

export function buildManualJournalPdfHeaderLines(
  snapshot: Pick<
    ManualJournalEntryPdfSnapshot,
    | "entryNo"
    | "entryDate"
    | "createdAt"
    | "submittedAt"
    | "confirmedAt"
    | "postedAt"
    | "description"
  >
): ManualJournalPdfHeaderLines {
  return {
    auditLine: buildFinanceDocumentAuditLine({
      documentNo: snapshot.entryNo,
      entryDate: snapshot.entryDate,
      createdAt: snapshot.createdAt,
      submittedAt: snapshot.submittedAt,
      confirmedAt: snapshot.confirmedAt,
      postedAt: snapshot.postedAt,
    }),
    description: snapshot.description?.trim() ? snapshot.description.trim() : null,
  }
}
