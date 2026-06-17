import { buildFinanceDocumentAuditLine } from "@/lib/finance-ui/finance-document-display"
import {
  financeAuditLine,
  financeDescriptionLabel,
  financeDescriptionLine,
} from "@/lib/finance-ui/finance-visual-classes"
import type { ManualJournalEntryRead } from "@/lib/finance-ui/manual-journal-entries"

type OpeningBalanceConfirmedDocumentHeaderProps = {
  documentNo: string
  entryDate: string
  description: string
  entry: ManualJournalEntryRead
}

export function OpeningBalanceConfirmedDocumentHeader({
  documentNo,
  entryDate,
  description,
  entry,
}: OpeningBalanceConfirmedDocumentHeaderProps) {
  const auditLine = buildFinanceDocumentAuditLine({
    documentNo,
    entryDate,
    createdAt: entry.createdAt,
    submittedAt: entry.submittedAt,
    confirmedAt: entry.confirmedAt,
    postedAt: entry.postedAt,
    cancelledAt: entry.cancelledAt,
  })

  return (
    <header className="space-y-1.5" data-testid="opb-confirmed-document-header">
      <p className={financeAuditLine} data-testid="finance-document-audit-line">
        <span data-testid="manual-journal-document-no">{auditLine}</span>
      </p>
      {description.trim() ? (
        <p className={financeDescriptionLine} data-testid="finance-document-description">
          <span className={financeDescriptionLabel}>Description:</span> {description.trim()}
        </p>
      ) : null}
    </header>
  )
}
