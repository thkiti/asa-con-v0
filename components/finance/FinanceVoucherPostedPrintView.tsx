"use client"

import Link from "next/link"
import {
  DocumentArchiveVaultActions,
  type DocumentArchiveVaultConfig,
} from "@/components/document-archive/DocumentArchiveVaultActions"
import { FinanceLegacyPdfSnapshotPanel } from "@/components/finance/FinanceLegacyPdfSnapshotPanel"
import { FinancePrintActions } from "@/components/finance/FinancePrintActions"
import { FinanceVoucherPrintFontProbe } from "@/components/finance/FinanceVoucherPrintFontProbe"
import { FinanceVoucherPrintSheet } from "@/components/finance/FinanceVoucherPrintSheet"
import { financeVoucherLocalFont } from "@/lib/finance-ui/finance-voucher-local-font"
import type { FinanceVoucherPrintModel } from "@/lib/finance-ui/finance-voucher-print"
import { financeDocumentContainer } from "@/lib/finance-ui/finance-visual-classes"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

export type FinanceVoucherPostedArchiveProps = {
  entryId: string
  entryNo: string
  pdfSnapshotReady: boolean
  onRegenerate?: () => void | Promise<void>
  regenerating?: boolean
  regenerateError?: string | null
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
}: FinanceVoucherPostedPrintViewProps) {
  const rootClass = [
    "finance-voucher-print-root",
    "finance-voucher-print-font",
    financeVoucherLocalFont.variable,
    financeVoucherLocalFont.className,
    embeddedInDocumentContainer ? "" : financeDocumentContainer,
    compactScreenHeader ? "finance-voucher-print-root--compact-screen-header" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={rootClass} data-testid="finance-voucher-print-root">
      <div className="no-print flex w-full flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <FinancePrintActions disabled={disabled} />
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
            entryId={archive.entryId}
            entryNo={archive.entryNo}
            pdfSnapshotReady={archive.pdfSnapshotReady}
            disabled={disabled}
            onRegenerate={archive.onRegenerate}
            regenerating={archive.regenerating}
            regenerateError={archive.regenerateError}
            showRegenerateButton={archive.showRegenerateButton}
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
