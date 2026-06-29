import { buildManualJournalPdfApiPath } from "@/lib/finance/inquiry/finance-document-inquiry-links"
import type { FinanceDocumentInquiryRow } from "@/lib/finance-ui/types"
import {
  financePdfIndicator,
  financePdfIndicatorExists,
  financePdfIndicatorLink,
  financePdfIndicatorMissing,
  financePdfIndicatorStatic,
  financePdfIndicatorUnsupported,
} from "@/lib/finance-ui/finance-visual-classes"

function resolvePdfApiHref(row: FinanceDocumentInquiryRow): string | null {
  if (
    row.pdfAvailable &&
    row.operationalDocumentId &&
    (row.documentTypeCode === "MJV" || row.documentTypeCode === "OPB")
  ) {
    return buildManualJournalPdfApiPath(row.operationalDocumentId)
  }
  return null
}

function resolvePdfStatusLabel(pdfAvailable: boolean | null): string {
  if (pdfAvailable === true) return "PDF exists"
  if (pdfAvailable === false) return "PDF missing"
  return "PDF not supported"
}

function resolvePdfIndicatorClass(pdfAvailable: boolean | null): string {
  if (pdfAvailable === true) return `${financePdfIndicator} ${financePdfIndicatorExists}`
  if (pdfAvailable === false) return `${financePdfIndicator} ${financePdfIndicatorMissing}`
  return `${financePdfIndicator} ${financePdfIndicatorUnsupported}`
}

type VoucherInquiryPdfIndicatorProps = {
  row: FinanceDocumentInquiryRow
}

export function VoucherInquiryPdfIndicator({ row }: VoucherInquiryPdfIndicatorProps) {
  const href = resolvePdfApiHref(row)
  const label = resolvePdfStatusLabel(row.pdfAvailable)
  const dot = <span className={resolvePdfIndicatorClass(row.pdfAvailable)} aria-hidden="true" />

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={financePdfIndicatorLink}
        aria-label={label}
        title={label}
        data-testid={`voucher-inquiry-pdf-${row.id}`}
      >
        {dot}
      </a>
    )
  }

  return (
    <span
      className={financePdfIndicatorStatic}
      aria-label={label}
      title={label}
      role="img"
      data-testid={`voucher-inquiry-pdf-${row.id}`}
    >
      {dot}
    </span>
  )
}
