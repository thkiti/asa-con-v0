"use client"

import Link from "next/link"
import { FinanceViewArchivedPdfButton } from "@/components/finance/FinanceViewArchivedPdfButton"
import { FinanceViewDocumentArchivePdfButton } from "@/components/finance/FinanceViewDocumentArchivePdfButton"
import { buildFinanceDocumentStickyIdentityLabel } from "@/lib/finance-ui/finance-document-display"
import {
  financeAuditLine,
  financePostedDocumentStickyBar,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

type FinancePostedDocumentStickyBarProps = {
  documentNo: string
  status: string
  legalEntityCode: string
  postedJournalHref?: string | null
  archiveReady?: boolean
  archiveEntryId?: string
  archiveEntryNo?: string
  pdfCacheKey?: string | null
  archiveVaultDocumentKind?: string
  archiveVaultDocumentId?: string
  archiveVaultDocumentNo?: string
  disabled?: boolean
}

/**
 * Compact sticky identity + actions for posted MJV detail.
 * Direct child of print root so position:sticky spans the full voucher scroll area.
 */
export function FinancePostedDocumentStickyBar({
  documentNo,
  status,
  legalEntityCode,
  postedJournalHref = null,
  archiveReady = false,
  archiveEntryId,
  archiveEntryNo,
  pdfCacheKey = null,
  archiveVaultDocumentKind,
  archiveVaultDocumentId,
  archiveVaultDocumentNo,
  disabled = false,
}: FinancePostedDocumentStickyBarProps) {
  const identityLabel = buildFinanceDocumentStickyIdentityLabel({
    documentNo,
    status,
    legalEntityCode,
  })

  return (
    <div
      className={`${financePostedDocumentStickyBar} no-print`}
      data-testid="posted-document-sticky-bar"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={`${financeAuditLine} min-w-0 flex-1`}
          data-testid="posted-document-sticky-identity"
        >
          {identityLabel}
        </p>
        <div
          className="flex shrink-0 flex-wrap items-center gap-2"
          data-testid="posted-document-actions"
        >
          {archiveReady && archiveEntryId && archiveEntryNo ? (
            <FinanceViewArchivedPdfButton
              entryId={archiveEntryId}
              entryNo={archiveEntryNo}
              pdfCacheKey={pdfCacheKey}
              disabled={disabled}
              layout="inline"
            />
          ) : archiveReady &&
            archiveVaultDocumentKind &&
            archiveVaultDocumentId &&
            archiveVaultDocumentNo ? (
            <FinanceViewDocumentArchivePdfButton
              documentKind={archiveVaultDocumentKind}
              documentId={archiveVaultDocumentId}
              documentNo={archiveVaultDocumentNo}
              disabled={disabled}
              layout="inline"
            />
          ) : null}
          {postedJournalHref ? (
            <Link
              href={postedJournalHref}
              className={`text-sm ${themeLinkMuted}`}
              data-testid="posted-journal-link"
            >
              View posted GL journal
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
