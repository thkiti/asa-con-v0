"use client"

import { PayInSlipIndicator } from "@/components/finance/PayInSlipIndicator"
import type { CollectorPickupSettlementReconciliation } from "@/lib/finance-ui/collector-pickup-settlement"
import {
  collectorPickupBusinessStatusTone,
  isPayInSlipUploaded,
  mapCollectorPickupBusinessStatus,
  shouldShowDepositPostButton,
  shouldShowDepositPostDisabled,
  shouldShowPickupRepairButton,
} from "@/lib/finance-ui/collector-pickup-settlement-display"
import { formatAmount } from "@/lib/finance-ui/format"
import {
  financeTable,
  financeTableScroll,
  financeTdSettlementAmount,
  financeTdSettlementStatus,
  financeTh,
  financeThSettlementAmount,
  financeThSettlementStatus,
} from "@/lib/finance-ui/finance-visual-classes"

type CollectorPickupSettlementTableProps = {
  items: CollectorPickupSettlementReconciliation[]
  depositPostingReportId?: string | null
  onUploadSlip?: (row: CollectorPickupSettlementReconciliation) => void
  onPreviewPayInSlip?: (row: CollectorPickupSettlementReconciliation) => void
  onDepositPost?: (collectorReportId: string) => void
  onRepairPickup?: (collectorReportId: string) => void
  depositPostError?: string | null
}

function formatBranch(row: CollectorPickupSettlementReconciliation): string {
  const code = row.branchCode?.trim()
  const name = row.branchName?.trim()
  if (code && name) return `${code} — ${name}`
  return code ?? name ?? row.branchId
}

function BusinessStatusBadge({
  row,
}: {
  row: CollectorPickupSettlementReconciliation
}) {
  const label = mapCollectorPickupBusinessStatus(row.status)
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${collectorPickupBusinessStatusTone(label)}`}
    >
      {label}
    </span>
  )
}

export function CollectorPickupSettlementTable({
  items,
  depositPostingReportId = null,
  onUploadSlip,
  onPreviewPayInSlip,
  onDepositPost,
  onRepairPickup,
  depositPostError = null,
}: CollectorPickupSettlementTableProps) {
  if (items.length === 0) {
    return (
      <p className="mt-4 text-sm text-zinc-600">
        No collector reports in this range.
      </p>
    )
  }

  return (
    <div className={`mt-6 ${financeTableScroll}`}>
      <table className={financeTable} data-testid="collector-pickup-settlement-table">
        <thead>
          <tr>
            <th className={financeTh}>Collect No</th>
            <th className={financeTh}>Branch</th>
            <th className={financeThSettlementAmount}>Expected</th>
            <th className={financeThSettlementStatus}>Status</th>
            <th className={financeTh}>PAY-IN Slip</th>
            <th className={financeThSettlementStatus}>Deposit</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const slipUploaded = isPayInSlipUploaded(row.payInEvidenceStatus)
            const showDepositPost = shouldShowDepositPostButton({
              pickupStatus: row.status,
              depositStatus: row.depositStatus,
              payInEvidenceStatus: row.payInEvidenceStatus,
            })
            const showDepositPostDisabled = shouldShowDepositPostDisabled({
              pickupStatus: row.status,
              depositStatus: row.depositStatus,
              payInEvidenceStatus: row.payInEvidenceStatus,
            })
            const isDepositPosting = depositPostingReportId === row.collectorReportId
            const showRepair = shouldShowPickupRepairButton(row.status)
            const canUploadSlip =
              row.status === "POSTED" && row.depositStatus === "NOT_POSTED"

            return (
              <tr key={row.collectorReportId}>
                <td className="font-mono text-sm">{row.collectNo}</td>
                <td className="text-sm">{formatBranch(row)}</td>
                <td className={financeTdSettlementAmount}>
                  {formatAmount(row.expectedAmount)}
                </td>
                <td className={financeTdSettlementStatus}>
                  <BusinessStatusBadge row={row} />
                  {showRepair && onRepairPickup ? (
                    <button
                      type="button"
                      data-testid={`pickup-repair-${row.collectorReportId}`}
                      className="ml-2 text-[10px] text-amber-800 underline"
                      onClick={() => onRepairPickup(row.collectorReportId)}
                    >
                      Repair
                    </button>
                  ) : null}
                </td>
                <td className="text-center">
                  <PayInSlipIndicator
                    status={row.payInEvidenceStatus}
                    missingWarning={row.payInSlipMissingWarning}
                    testId={`pay-in-slip-${row.collectorReportId}`}
                    onUpload={
                      canUploadSlip && onUploadSlip
                        ? () => onUploadSlip(row)
                        : undefined
                    }
                    onPreview={
                      slipUploaded && row.payInEvidenceUrl && onPreviewPayInSlip
                        ? () => onPreviewPayInSlip(row)
                        : undefined
                    }
                  />
                </td>
                <td className={financeTdSettlementStatus}>
                  {row.depositStatus === "POSTED" ? (
                    <span
                      className="inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-green-800"
                      data-testid={`deposit-posted-${row.collectorReportId}`}
                    >
                      POSTED
                    </span>
                  ) : showDepositPost && onDepositPost ? (
                    <button
                      type="button"
                      data-testid={`deposit-post-${row.collectorReportId}`}
                      disabled={isDepositPosting}
                      onClick={() => onDepositPost(row.collectorReportId)}
                      className="rounded bg-zinc-900 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white disabled:opacity-50"
                    >
                      {isDepositPosting ? "Posting…" : "POST"}
                    </button>
                  ) : showDepositPostDisabled ? (
                    <button
                      type="button"
                      data-testid={`deposit-post-disabled-${row.collectorReportId}`}
                      disabled={isDepositPosting}
                      title="Upload PAY-IN Slip first"
                      onClick={() => onDepositPost?.(row.collectorReportId)}
                      className="rounded bg-zinc-300 px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-600"
                    >
                      POST
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {depositPostError ? (
        <p
          className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          data-testid="deposit-post-error"
        >
          {depositPostError}
        </p>
      ) : null}
    </div>
  )
}
