import {
  buildFinanceDocumentIdentityRow2Slash,
  type FinanceDocumentIdentityRow2Input,
} from "@/lib/finance-ui/finance-document-display"
import { financeAuditLine } from "@/lib/finance-ui/finance-visual-classes"

type FinanceDocumentSummaryRowProps = FinanceDocumentIdentityRow2Input

/** Screen-only document summary (Row 2) — pairs with EntityContextPageHeading on detail pages. */
export function FinanceDocumentSummaryRow(props: FinanceDocumentSummaryRowProps) {
  return (
    <p
      className={`${financeAuditLine} no-print`}
      data-testid="finance-document-summary-row"
    >
      {buildFinanceDocumentIdentityRow2Slash(props)}
    </p>
  )
}
