"use client"

import { CollectorPickupSettlementStatusBadge } from "@/components/finance/CollectorPickupSettlementStatusBadge"
import { PayInSlipIndicator } from "@/components/finance/PayInSlipIndicator"
import type { CollectorPickupSettlementReconciliation } from "@/lib/finance-ui/collector-pickup-settlement"
import type { BankDepositSettlementStatus } from "@/lib/finance-ui/pos-settlement-status-types"
import {
  collectorPickupSettlementActionHint,
  shouldShowCollectorPickupPostButton,
  shouldShowPayInButton,
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
  postingReportId?: string | null
  payInReportId?: string | null
  onPost?: (collectorReportId: string) => void
  onPayIn?: (row: CollectorPickupSettlementReconciliation) => void
  onPreviewPayInSlip?: (row: CollectorPickupSettlementReconciliation) => void
}

function formatBranch(row: CollectorPickupSettlementReconciliation): string {
  const code = row.branchCode?.trim()
  const name = row.branchName?.trim()
  if (code && name) return `${code} — ${name}`
  return code ?? name ?? row.branchId
}

const depositStatusTone: Record<BankDepositSettlementStatus, string> = {
  NOT_POSTED: "bg-zinc-100 text-zinc-800",
  POSTED: "bg-green-100 text-green-800",
  VARIANCE: "bg-amber-100 text-amber-800",
  INVALID_SOURCE: "bg-orange-100 text-orange-900",
  NOT_ELIGIBLE: "bg-slate-100 text-slate-700",
}

function DepositStatusBadge({ status }: { status: BankDepositSettlementStatus }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${depositStatusTone[status]}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  )
}

export function CollectorPickupSettlementTable({
  items,
  postingReportId = null,
  payInReportId = null,
  onPost,
  onPayIn,
  onPreviewPayInSlip,
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
            <th className={financeThSettlementStatus}>Pickup Status</th>
            <th className={financeTh}>Pickup Voucher</th>
            <th className={financeTh}>PAY-IN Slip</th>
            <th className={financeThSettlementStatus}>Deposit Status</th>
            <th className={financeTh}>Bank Voucher</th>
            <th className={financeTh}>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const showPost = shouldShowCollectorPickupPostButton(row.status)
            const showPayIn = shouldShowPayInButton({
              pickupStatus: row.status,
              depositStatus: row.depositStatus,
            })
            const isPosting = postingReportId === row.collectorReportId
            const isPayInBusy = payInReportId === row.collectorReportId
            const actionHint = collectorPickupSettlementActionHint({
              pickupStatus: row.status,
              depositStatus: row.depositStatus,
              payInSlipMissingWarning: row.payInSlipMissingWarning,
            })

            return (
              <tr key={row.collectorReportId}>
                <td className="font-mono text-sm">{row.collectNo}</td>
                <td className="text-sm">{formatBranch(row)}</td>
                <td className={financeTdSettlementAmount}>
                  {formatAmount(row.expectedAmount)}
                </td>
                <td className={financeTdSettlementStatus}>
                  <CollectorPickupSettlementStatusBadge status={row.status} />
                </td>
                <td className="font-mono text-sm">{row.voucherNo ?? "—"}</td>
                <td className="text-center">
                  <PayInSlipIndicator
                    status={row.payInEvidenceStatus}
                    missingWarning={row.payInSlipMissingWarning}
                    testId={`pay-in-slip-${row.collectorReportId}`}
                    onUpload={
                      showPayIn && onPayIn ? () => onPayIn(row) : undefined
                    }
                    onPreview={
                      row.payInEvidenceUrl && onPreviewPayInSlip
                        ? () => onPreviewPayInSlip(row)
                        : undefined
                    }
                  />
                </td>
                <td className={financeTdSettlementStatus}>
                  <DepositStatusBadge status={row.depositStatus} />
                </td>
                <td className="font-mono text-sm">
                  {row.bankDepositVoucherNo ?? "—"}
                </td>
                <td>
                  {showPost && onPost ? (
                    <button
                      type="button"
                      data-testid={`collector-pickup-post-${row.collectorReportId}`}
                      disabled={isPosting}
                      onClick={() => onPost(row.collectorReportId)}
                      className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {isPosting ? "Posting…" : "Post Settlement"}
                    </button>
                  ) : showPayIn && onPayIn ? (
                    <button
                      type="button"
                      data-testid={`pay-in-open-${row.collectorReportId}`}
                      disabled={isPayInBusy}
                      onClick={() => onPayIn(row)}
                      className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {isPayInBusy ? "Processing…" : "PAY-IN"}
                    </button>
                  ) : actionHint ? (
                    <span
                      className={[
                        "text-xs",
                        row.payInSlipMissingWarning
                          ? "font-medium text-amber-700"
                          : "text-zinc-600",
                      ].join(" ")}
                    >
                      {actionHint}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
