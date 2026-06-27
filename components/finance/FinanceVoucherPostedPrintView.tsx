"use client"

import Link from "next/link"
import { FinanceLegacyPdfSnapshotPanel } from "@/components/finance/FinanceLegacyPdfSnapshotPanel"
import { FinancePrintActions } from "@/components/finance/FinancePrintActions"
import { FinanceVoucherPrintFontProbe } from "@/components/finance/FinanceVoucherPrintFontProbe"
import { FinanceVoucherPrintSheet } from "@/components/finance/FinanceVoucherPrintSheet"
import { financeVoucherLocalFont } from "@/lib/finance-ui/finance-voucher-local-font"
import type { FinanceVoucherPrintModel } from "@/lib/finance-ui/finance-voucher-print"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

export type FinanceVoucherPostedArchiveProps = {
  entryId: string
  entryNo: string
  pdfSnapshotReady: boolean
  onRetry?: () => void | Promise<void>
  retrying?: boolean
  retryError?: string | null
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
}: FinanceVoucherPostedPrintViewProps) {
  return (
    <div
      className={`finance-voucher-print-root finance-document-container finance-voucher-print-font ${financeVoucherLocalFont.variable} ${financeVoucherLocalFont.className}`}
      data-testid="finance-voucher-print-root"
    >
      <div className="no-print flex w-full flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <FinancePrintActions disabled={disabled} />
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
            onRetry={archive.onRetry}
            retrying={archive.retrying}
            retryError={archive.retryError}
          />
        ) : null}
        <Link
          href={listHref}
          className={`text-sm ${themeLinkMuted}`}
          data-testid="action-back"
        >
          ← {listBackLabel}
        </Link>
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
