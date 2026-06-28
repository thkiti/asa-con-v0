import { BankDepositSettlementStatusBadge } from "@/components/finance/BankDepositSettlementStatusBadge"
import { PayInSlipIndicator } from "@/components/finance/PayInSlipIndicator"
import type { BankDepositSettlementReconciliation } from "@/lib/finance-ui/bank-deposit-settlement"
import {
  bankDepositSettlementActionHint,
  shouldShowBankDepositPayInButton,
} from "@/lib/finance-ui/bank-deposit-settlement-display"
import { formatAmount } from "@/lib/finance-ui/format"
import {
  financeTable,
  financeTableScroll,
  financeTdSettlementAmount,
  financeTdSettlementStatus,
  financeTh,
  financeThRight,
  financeThSettlementAmount,
  financeThSettlementStatus,
} from "@/lib/finance-ui/finance-visual-classes"

type BankDepositSettlementTableProps = {
  items: BankDepositSettlementReconciliation[]
  payInReportId?: string | null
  onPayIn?: (row: BankDepositSettlementReconciliation) => void
  onPreviewPayInSlip?: (row: BankDepositSettlementReconciliation) => void
}

function formatBranch(row: BankDepositSettlementReconciliation): string {
  const code = row.branchCode?.trim()
  const name = row.branchName?.trim()
  if (code && name) return `${code} — ${name}`
  return code ?? name ?? row.branchId
}

export function BankDepositSettlementTable({
  items,
  payInReportId = null,
  onPayIn,
  onPreviewPayInSlip,
}: BankDepositSettlementTableProps) {
  if (items.length === 0) {
    return (
      <p className="mt-4 text-sm text-zinc-600">
        No collector reports in this range.
      </p>
    )
  }

  return (
    <div className={`mt-6 ${financeTableScroll}`}>
      <table className={financeTable} data-testid="bank-deposit-settlement-table">
        <thead>
          <tr>
            <th className={financeTh}>Collect No</th>
            <th className={financeTh}>Branch</th>
            <th className={financeTh}>Mode</th>
            <th className={financeThSettlementAmount}>In Transit</th>
            <th className={financeTh}>PAY-IN Slip</th>
            <th className={financeThSettlementStatus}>Status</th>
            <th className={financeThRight}>Variance</th>
            <th className={financeTh}>Pickup Voucher</th>
            <th className={financeTh}>Deposit Voucher</th>
            <th className={financeTh}>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const showPayIn = shouldShowBankDepositPayInButton(row.status)
            const isPayInBusy = payInReportId === row.collectorReportId
            const actionHint = bankDepositSettlementActionHint({
              status: row.status,
              payInSlipMissingWarning: row.payInSlipMissingWarning,
            })

            return (
              <tr key={row.collectorReportId}>
                <td className="font-mono text-sm">{row.collectNo}</td>
                <td className="text-sm">{formatBranch(row)}</td>
                <td className="text-sm">{row.mode ?? "—"}</td>
                <td className={financeTdSettlementAmount}>
                  {formatAmount(row.inTransitAmount)}
                </td>
                <td className="text-center">
                  <PayInSlipIndicator
                    status={row.payInEvidenceStatus}
                    missingWarning={row.payInSlipMissingWarning}
                    testId={`pay-in-slip-${row.collectorReportId}`}
                    onUpload={showPayIn && onPayIn ? () => onPayIn(row) : undefined}
                    onPreview={
                      row.payInEvidenceUrl && onPreviewPayInSlip
                        ? () => onPreviewPayInSlip(row)
                        : undefined
                    }
                  />
                </td>
                <td className={financeTdSettlementStatus}>
                  <BankDepositSettlementStatusBadge status={row.status} />
                </td>
                <td className="text-right tabular-nums text-sm">
                  {formatAmount(row.variance)}
                </td>
                <td className="font-mono text-sm">
                  {row.collectorPickupVoucherNo ?? "—"}
                </td>
                <td className="font-mono text-sm">{row.voucherNo ?? "—"}</td>
                <td>
                  {showPayIn && onPayIn ? (
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
