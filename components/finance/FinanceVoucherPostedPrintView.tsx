"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  DocumentArchiveVaultActions,
  type DocumentArchiveVaultConfig,
} from "@/components/document-archive/DocumentArchiveVaultActions"
import { FinancePostedDocumentStickyBar } from "@/components/finance/FinancePostedDocumentStickyBar"
import { FinanceArchivedPdfAdminRepair } from "@/components/finance/FinanceArchivedPdfAdminRepair"
import { FinanceDocumentArchiveAdminRepair } from "@/components/finance/FinanceDocumentArchiveAdminRepair"
import { FinanceDocumentArchiveMissingPanel } from "@/components/finance/FinanceDocumentArchiveMissingPanel"
import { FinanceLegacyPdfSnapshotPanel } from "@/components/finance/FinanceLegacyPdfSnapshotPanel"
import { FinancePrintActions } from "@/components/finance/FinancePrintActions"
import { FinanceVoucherPrintFontProbe } from "@/components/finance/FinanceVoucherPrintFontProbe"
import { FinanceVoucherPrintSheet } from "@/components/finance/FinanceVoucherPrintSheet"
import { fetchDocumentArchivePdfStatus } from "@/lib/document-archive-ui/client"
import { financeVoucherLocalFont } from "@/lib/finance-ui/finance-voucher-local-font"
import type { DocumentEntityCode } from "@/lib/legal-entity"
import type { FinanceVoucherPrintModel } from "@/lib/finance-ui/finance-voucher-print"
import {
  financeDocumentContainer,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

export type FinanceVoucherPostedArchiveProps = {
  entryId: string
  entryNo: string
  pdfSnapshotReady: boolean
  pdfCacheKey?: string | null
  onRegenerate?: () => void | Promise<void>
  regenerating?: boolean
  regenerateError?: string | null
  onDelete?: () => void | Promise<void>
  deleting?: boolean
  showRegenerateButton?: boolean
}

type FinanceVoucherPostedPrintViewProps = {
  model: FinanceVoucherPrintModel
  entryType: string
  legalEntityCode: string
  entryDate: string
  description: string
  listHref: string
  listBackLabel: string
  postedJournalHref?: string | null
  disabled?: boolean
  showArchivePanel?: boolean
  archive?: FinanceVoucherPostedArchiveProps
  archiveVault?: DocumentArchiveVaultConfig
  /** When true, omit nested document container (parent page already wraps). */
  embeddedInDocumentContainer?: boolean
  /** Hide duplicate identity rows on screen; print sheet keeps full header when printing. */
  compactScreenHeader?: boolean
  /** When false, rely on page-level back link (e.g. MJV detail). Default true for legacy voucher pages. */
  showListBackLink?: boolean
  /** When false, hide Print Out / Save as PDF (e.g. MJV uses archived PDF only). Default true. */
  showPrintActions?: boolean
  /** When false, hide Download archived PDF in the snapshot panel. Default true. */
  showArchiveDownload?: boolean
  /**
   * When true, existing archive uses a compact top action row (MJV detail).
   * Missing archive still shows the warning/repair panel.
   */
  compactArchiveActions?: boolean
  /** HO_ADMIN vault upload/replace behind Archive repair toggle. */
  archiveVaultAdminRepair?: boolean
}

/** Canonical POSTED view: browser print/save PDF sheet + optional archived snapshot panel. */
export function FinanceVoucherPostedPrintView({
  model,
  entryType,
  legalEntityCode,
  entryDate,
  description,
  listHref,
  listBackLabel,
  postedJournalHref = null,
  disabled = false,
  showArchivePanel = true,
  archive,
  archiveVault,
  embeddedInDocumentContainer = false,
  compactScreenHeader = false,
  showListBackLink = true,
  showPrintActions = true,
  showArchiveDownload = true,
  compactArchiveActions = false,
  archiveVaultAdminRepair = false,
}: FinanceVoucherPostedPrintViewProps) {
  const useCompactArchive =
    compactArchiveActions && Boolean(archive || archiveVault)
  const archiveReady = archive?.pdfSnapshotReady ?? false
  const [vaultPdfAvailable, setVaultPdfAvailable] = useState<boolean | null>(
    archiveVault?.initialPdfAvailable ?? null
  )

  const refreshVaultPdfStatus = useCallback(() => {
    if (!archiveVault) return
    void fetchDocumentArchivePdfStatus(legalEntityCode as DocumentEntityCode, {
      documentKind: archiveVault.documentKind,
      documentId: archiveVault.documentId,
      documentNo: archiveVault.documentNo,
      workflowStatus: archiveVault.workflowStatus,
    })
      .then((status) => setVaultPdfAvailable(status))
      .catch(() => {
        // Keep server-provided initial state when status fetch is unavailable.
      })
  }, [archiveVault, legalEntityCode])

  useEffect(() => {
    setVaultPdfAvailable(archiveVault?.initialPdfAvailable ?? null)
  }, [archiveVault?.initialPdfAvailable])

  useEffect(() => {
    if (!archiveVault || !useCompactArchive) return
    refreshVaultPdfStatus()
  }, [archiveVault, refreshVaultPdfStatus, useCompactArchive])

  const vaultArchiveReady = vaultPdfAvailable === true
  const stickyArchiveReady = archive ? archiveReady : vaultArchiveReady

  const rootClass = [
    "finance-voucher-print-root",
    "finance-voucher-print-font",
    "w-full max-w-full",
    financeVoucherLocalFont.variable,
    financeVoucherLocalFont.className,
    embeddedInDocumentContainer
      ? "finance-voucher-print-root--embedded"
      : financeDocumentContainer,
    compactScreenHeader ? "finance-voucher-print-root--compact-screen-header" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={rootClass} data-testid="finance-voucher-print-root">
      {useCompactArchive ? (
        <>
          <FinancePostedDocumentStickyBar
            documentNo={model.documentNo}
            status={model.status}
            legalEntityCode={legalEntityCode}
            postedJournalHref={postedJournalHref}
            archiveReady={stickyArchiveReady}
            archiveEntryId={archive?.entryId}
            archiveEntryNo={archive?.entryNo}
            pdfCacheKey={archive?.pdfCacheKey}
            archiveVaultDocumentKind={archiveVault?.documentKind}
            archiveVaultDocumentId={archiveVault?.documentId}
            archiveVaultDocumentNo={archiveVault?.documentNo}
            disabled={disabled}
          />
          <div className="no-print flex w-full flex-col gap-2">
            {archive ? (
              archiveReady ? (
                archive.showRegenerateButton ? (
                  <FinanceArchivedPdfAdminRepair
                    disabled={disabled}
                    regenerating={archive.regenerating}
                    regenerateError={archive.regenerateError}
                    deleting={archive.deleting}
                    onRegenerate={archive.onRegenerate}
                    onDelete={archive.onDelete}
                  />
                ) : null
              ) : (
                <FinanceLegacyPdfSnapshotPanel
                  legalEntityCode={legalEntityCode as DocumentEntityCode}
                  entryId={archive.entryId}
                  entryNo={archive.entryNo}
                  pdfSnapshotReady={false}
                  pdfCacheKey={archive.pdfCacheKey}
                  disabled={disabled}
                  onRegenerate={archive.onRegenerate}
                  regenerating={archive.regenerating}
                  regenerateError={archive.regenerateError}
                  onDelete={archive.onDelete}
                  deleting={archive.deleting}
                  showRegenerateButton={archive.showRegenerateButton}
                  showDownloadButton={false}
                />
              )
            ) : archiveVault ? (
              <>
                {!vaultArchiveReady ? <FinanceDocumentArchiveMissingPanel /> : null}
                {archiveVaultAdminRepair ? (
                  <FinanceDocumentArchiveAdminRepair
                    {...archiveVault}
                    disabled={disabled}
                    onPdfAvailableChange={setVaultPdfAvailable}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </>
      ) : (
        <div className="no-print flex w-full flex-col gap-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {showPrintActions ? <FinancePrintActions disabled={disabled} /> : null}
              {archiveVault ? (
                <DocumentArchiveVaultActions {...archiveVault} disabled={disabled} />
              ) : null}
            </div>
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
          {showArchivePanel && archive ? (
            <FinanceLegacyPdfSnapshotPanel
              legalEntityCode={legalEntityCode as DocumentEntityCode}
              entryId={archive.entryId}
              entryNo={archive.entryNo}
              pdfSnapshotReady={archive.pdfSnapshotReady}
              pdfCacheKey={archive.pdfCacheKey}
              disabled={disabled}
              onRegenerate={archive.onRegenerate}
              regenerating={archive.regenerating}
              regenerateError={archive.regenerateError}
              onDelete={archive.onDelete}
              deleting={archive.deleting}
              showRegenerateButton={archive.showRegenerateButton}
              showDownloadButton={showArchiveDownload}
            />
          ) : null}
          {showListBackLink ? (
            <Link
              href={listHref}
              className={`text-sm ${themeLinkMuted}`}
              data-testid="action-back"
            >
              ← {listBackLabel}
            </Link>
          ) : null}
        </div>
      )}
      <FinanceVoucherPrintSheet
        model={model}
        entryType={entryType}
        legalEntityCode={legalEntityCode}
        entryDate={entryDate}
        description={description}
      />
      <FinanceVoucherPrintFontProbe />
    </div>
  )
}
