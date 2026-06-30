import { buildDocumentArchiveByDocumentDownloadPath } from "@/lib/document-archive-ui/paths"
import { buildManualJournalPdfApiPath } from "@/lib/finance/inquiry/finance-document-inquiry-links"
import { resolveOperationalVoucherDocumentKindByDocType } from "@/lib/document-archive/operational-voucher-kind"
import type { FinanceDocumentInquiryRow } from "@/lib/finance-ui/types"
import {
  financePdfIndicator,
  financePdfIndicatorExists,
  financePdfIndicatorLink,
  financePdfIndicatorMissing,
  financePdfIndicatorStatic,
} from "@/lib/finance-ui/finance-visual-classes"

function resolveColArchiveApiHref(row: FinanceDocumentInquiryRow): string | null {
  if (row.archiveAvailable !== true || !row.operationalDocumentId) {
    return null
  }
  return buildDocumentArchiveByDocumentDownloadPath(
    "COL",
    row.operationalDocumentId,
    "BANK_PAY_IN_SLIP"
  )
}

function resolvePdfApiHref(row: FinanceDocumentInquiryRow): string | null {
  if (row.documentTypeCode === "COL") {
    return resolveColArchiveApiHref(row)
  }

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

function resolveArchiveTriState(row: FinanceDocumentInquiryRow): boolean | null {
  if (row.documentTypeCode === "COL") {
    return row.archiveAvailable ?? null
  }
  return row.pdfAvailable
}

function resolvePdfStatusLabel(
  row: FinanceDocumentInquiryRow,
  triState: boolean | null
): string {
  const isCol = row.documentTypeCode === "COL"
  if (triState === true) return isCol ? "Evidence exists" : "PDF exists"
  if (triState === false) return isCol ? "Evidence missing" : "PDF missing"
  return isCol ? "Evidence not supported" : "PDF not supported"
}

function resolvePdfIndicatorClass(triState: boolean | null): string {
  if (triState === true) return `${financePdfIndicator} ${financePdfIndicatorExists}`
  if (triState === false) return `${financePdfIndicator} ${financePdfIndicatorMissing}`
  return financePdfIndicator
}

type VoucherInquiryPdfIndicatorProps = {
  row: FinanceDocumentInquiryRow
}

/** Red dot when required evidence is missing; green when present; hidden when unsupported. */
export function VoucherInquiryPdfIndicator({ row }: VoucherInquiryPdfIndicatorProps) {
  const triState = resolveArchiveTriState(row)
  if (triState === null) {
    return null
  }

  const href = resolvePdfApiHref(row)
  const label = resolvePdfStatusLabel(row, triState)
  const dot = <span className={resolvePdfIndicatorClass(triState)} aria-hidden="true" />

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
