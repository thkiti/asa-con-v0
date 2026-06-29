import type { StockDocumentInquiryRow } from "@/lib/stock-ui/stock-document-inquiry"
import {
  financePdfIndicator,
  financePdfIndicatorMissing,
  financePdfIndicatorStatic,
} from "@/lib/finance-ui/finance-visual-classes"

type StockDocumentInquiryPdfIndicatorProps = {
  row: Pick<StockDocumentInquiryRow, "id" | "pdfAvailable">
}

/** Show a red dot only when archive PDF is missing; hide when unsupported or exists. */
export function StockDocumentInquiryPdfIndicator({
  row,
}: StockDocumentInquiryPdfIndicatorProps) {
  if (row.pdfAvailable !== false) {
    return null
  }

  const label = "PDF missing"

  return (
    <span
      className={financePdfIndicatorStatic}
      aria-label={label}
      title={label}
      role="img"
      data-testid={`stock-document-inquiry-pdf-${row.id}`}
    >
      <span
        className={`${financePdfIndicator} ${financePdfIndicatorMissing}`}
        aria-hidden="true"
      />
    </span>
  )
}
