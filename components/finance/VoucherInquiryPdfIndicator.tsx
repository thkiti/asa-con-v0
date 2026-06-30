import { buildDocumentArchiveByDocumentDownloadPath } from "@/lib/document-archive-ui/paths"
import { resolveOperationalVoucherDocumentKindByDocType } from "@/lib/document-archive/operational-voucher-kind"
import { buildManualJournalPdfApiPath } from "@/lib/finance/inquiry/finance-document-inquiry-links"
import type { FinanceDocumentInquiryRow } from "@/lib/finance-ui/types"
import {
  financePdfIndicator,
  financePdfIndicatorExists,
  financePdfIndicatorLink,
  financePdfIndicatorMissing,
  financePdfIndicatorStatic,
} from "@/lib/finance-ui/finance-visual-classes"

function resolvePdfApiHref(row: FinanceDocumentInquiryRow): string | null {
  if (!row.pdfAvailable || !row.operationalDocumentId) {
    return null
  }

  if (row.documentTypeCode === "MJV" || row.documentTypeCode === "OPB") {
    return buildManualJournalPdfApiPath(row.operationalDocumentId)
  }

  const operationalKind = resolveOperationalVoucherDocumentKindByDocType(
    row.documentTypeCode
  )
  if (operationalKind) {
    return buildDocumentArchiveByDocumentDownloadPath(
      operationalKind,
      row.operationalDocumentId
    )
  }

  return null
}

function resolvePdfStatusLabel(pdfAvailable: boolean): string {
  return pdfAvailable ? "PDF exists" : "PDF missing"
}

function resolvePdfIndicatorClass(pdfAvailable: boolean): string {
  return pdfAvailable
    ? `${financePdfIndicator} ${financePdfIndicatorExists}`
    : `${financePdfIndicator} ${financePdfIndicatorMissing}`
}

type VoucherInquiryPdfIndicatorProps = {
  row: FinanceDocumentInquiryRow
}

/** Red dot when archive PDF is missing; green when present; hidden when unsupported. */
export function VoucherInquiryPdfIndicator({ row }: VoucherInquiryPdfIndicatorProps) {
  if (row.pdfAvailable === null) {
    return null
  }

  const href = resolvePdfApiHref(row)
  const label = resolvePdfStatusLabel(row.pdfAvailable)
  const dot = (
    <span className={resolvePdfIndicatorClass(row.pdfAvailable)} aria-hidden="true" />
  )

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
