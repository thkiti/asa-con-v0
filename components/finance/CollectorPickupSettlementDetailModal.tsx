"use client"

import Link from "next/link"
import type { CollectorPickupSettlementReconciliation } from "@/lib/finance-ui/collector-pickup-settlement"
import {
  buildDepositJournalDisplay,
  buildPickupJournalDisplay,
  formatDepositSettlementStatus,
  formatPayInEvidenceStatusLabel,
  formatPickupSettlementStatus,
  formatSettlementJournalLine,
  type SettlementJournalPairDisplay,
} from "@/lib/finance-ui/collector-pickup-settlement-detail"
import { formatAmount } from "@/lib/finance-ui/format"
import { buildFinanceVoucherDetailPath } from "@/lib/finance-ui/finance-navigation"
import {
  collectorPickupSettlementDetailJournalBox,
  collectorPickupSettlementDetailSectionTitle,
  collectorPickupSettlementDetailStatus,
  collectorPickupSettlementDetailTechnical,
  collectorPickupSettlementDetailVoucherLink,
} from "@/lib/finance-ui/finance-visual-classes"
import {
  themeDialogLight,
  themeDialogLightBtnSecondary,
  themeDialogLightLabel,
  themeDialogLightTitle,
  themeDialogOverlayCentered,
} from "@/lib/theme/theme-classes"

type CollectorPickupSettlementDetailModalProps = {
  open: boolean
  row: CollectorPickupSettlementReconciliation | null
  /** Full return path including settlement filter query params. */
  returnTo: string
  onClose: () => void
  onPreviewPayInSlip?: (row: CollectorPickupSettlementReconciliation) => void
}

function formatBranch(row: CollectorPickupSettlementReconciliation): string {
  const code = row.branchCode?.trim()
  const name = row.branchName?.trim()
  if (code && name) return `${code} — ${name}`
  return code ?? name ?? row.branchId
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={themeDialogLightLabel}>{label}</dt>
      <dd className={`mt-0.5 text-sm font-medium text-[#18181b]`}>{value}</dd>
    </div>
  )
}

function SettlementJournalLines({
  journal,
  voucherId,
  voucherNo,
  returnTo,
  onNavigateAway,
}: {
  journal: SettlementJournalPairDisplay
  voucherId: string | null
  voucherNo: string | null
  returnTo: string
  onNavigateAway?: () => void
}) {
  if (!journal.posted) {
    return <p className={collectorPickupSettlementDetailStatus}>No journal posted.</p>
  }

  return (
    <div className="space-y-2">
      <pre
        className={collectorPickupSettlementDetailJournalBox}
        data-testid="settlement-journal-lines"
      >
        {`${formatSettlementJournalLine("Dr", journal.debitAccount, formatAmount(journal.debitAmount))}
    ${formatSettlementJournalLine("Cr", journal.creditAccount, formatAmount(journal.creditAmount))}`}
      </pre>
      {voucherId ? (
        <p className="text-sm">
          <Link
            href={buildFinanceVoucherDetailPath(voucherId, returnTo)}
            className={collectorPickupSettlementDetailVoucherLink}
            data-testid="settlement-voucher-link"
            onClick={onNavigateAway}
          >
            {voucherNo ? `Voucher ${voucherNo}` : "View voucher"}
          </Link>
        </p>
      ) : null}
    </div>
  )
}

export function CollectorPickupSettlementDetailModal({
  open,
  row,
  returnTo,
  onClose,
  onPreviewPayInSlip,
}: CollectorPickupSettlementDetailModalProps) {
  if (!open || !row) return null

  const pickupJournal = buildPickupJournalDisplay(row)
  const depositJournal = buildDepositJournalDisplay(row)

  return (
    <div
      className={themeDialogOverlayCentered}
      data-testid="collector-pickup-settlement-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Collector settlement detail — ${row.collectNo}`}
      onClick={onClose}
    >
      <div
        className={`${themeDialogLight} max-h-[90vh] w-full max-w-lg overflow-auto p-5`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className={themeDialogLightTitle}>{row.collectNo}</h2>
          <button
            type="button"
            className={themeDialogLightBtnSecondary}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <DetailField label="Branch" value={formatBranch(row)} />
          <DetailField label="Expected" value={formatAmount(row.expectedAmount)} />
        </dl>

        <section className="mt-5 space-y-2" data-testid="pickup-settlement-detail">
          <h3 className={collectorPickupSettlementDetailSectionTitle}>Pickup posting</h3>
          <p className={collectorPickupSettlementDetailStatus}>
            Status: {formatPickupSettlementStatus(row.status)}
          </p>
          <SettlementJournalLines
            journal={pickupJournal}
            voucherId={row.voucherId}
            voucherNo={row.voucherNo}
            returnTo={returnTo}
            onNavigateAway={onClose}
          />
        </section>

        <section className="mt-5 space-y-2" data-testid="pay-in-evidence-detail">
          <h3 className={collectorPickupSettlementDetailSectionTitle}>PAY-IN slip</h3>
          <p className={collectorPickupSettlementDetailStatus}>
            {formatPayInEvidenceStatusLabel(row)}
          </p>
          {row.payInEvidenceUrl && onPreviewPayInSlip ? (
            <button
              type="button"
              className={collectorPickupSettlementDetailVoucherLink}
              data-testid="pay-in-slip-preview-link"
              onClick={() => onPreviewPayInSlip(row)}
            >
              View PAY-IN slip
            </button>
          ) : null}
        </section>

        <section className="mt-5 space-y-2" data-testid="deposit-settlement-detail">
          <h3 className={collectorPickupSettlementDetailSectionTitle}>
            PAY-IN / Deposit posting
          </h3>
          <p className={collectorPickupSettlementDetailStatus}>
            Status: {formatDepositSettlementStatus(row.depositStatus)}
          </p>
          <SettlementJournalLines
            journal={depositJournal}
            voucherId={row.bankDepositVoucherId}
            voucherNo={row.bankDepositVoucherNo}
            returnTo={returnTo}
            onNavigateAway={onClose}
          />
        </section>

        <details className={collectorPickupSettlementDetailTechnical}>
          <summary>Technical reference</summary>
          <p className="mt-2 font-mono text-[11px] leading-5" data-testid="collector-report-id-audit">
            Collector report ID: {row.collectorReportId}
          </p>
        </details>
      </div>
    </div>
  )
}
