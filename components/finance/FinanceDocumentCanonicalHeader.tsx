import {
  buildFinanceDocumentIdentityRow1,
  buildFinanceDocumentIdentityRow2,
  buildFinanceDocumentWorkflowAuditLine,
  type FinanceDocumentHeaderContext,
} from "@/lib/finance-ui/finance-document-display"
import {
  financeAuditLine,
  financeDescriptionLabel,
  financeDescriptionLine,
} from "@/lib/finance-ui/finance-visual-classes"

type FinanceDocumentCanonicalHeaderProps = FinanceDocumentHeaderContext

export function FinanceDocumentCanonicalHeader({
  legalEntityCode,
  entryType,
  documentNo,
  entryDate,
  status,
  description,
  createdAt,
  submittedAt,
  confirmedAt,
  postedAt,
  cancelledAt,
}: FinanceDocumentCanonicalHeaderProps) {
  const row1 = buildFinanceDocumentIdentityRow1(legalEntityCode, entryType)
  const row2 = buildFinanceDocumentIdentityRow2({ documentNo, entryDate, status })
  const workflowLine = buildFinanceDocumentWorkflowAuditLine({
    createdAt,
    submittedAt,
    confirmedAt,
    postedAt,
    cancelledAt,
  })

  return (
    <header className="space-y-1.5" data-testid="finance-document-header">
      <p className={financeAuditLine} data-testid="finance-document-identity-row1">
        {row1}
      </p>
      <p className={financeAuditLine} data-testid="finance-document-identity-row2">
        <span data-testid="manual-journal-document-no">{row2}</span>
      </p>
      {description.trim() ? (
        <p className={financeDescriptionLine} data-testid="finance-document-description">
          <span className={financeDescriptionLabel}>Description:</span> {description.trim()}
        </p>
      ) : null}
      <p className={financeAuditLine} data-testid="finance-document-workflow-audit">
        {workflowLine}
      </p>
    </header>
  )
}
