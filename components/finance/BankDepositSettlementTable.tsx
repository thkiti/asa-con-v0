import { BankDepositSettlementStatusBadge } from "@/components/finance/BankDepositSettlementStatusBadge"
import type { BankDepositSettlementReconciliation } from "@/lib/finance-ui/bank-deposit-settlement"
import {
  bankDepositSettlementActionHint,
  shouldShowBankDepositPostButton,
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
  postingReportId?: string | null
  onPost?: (collectorReportId: string) => void
}

function formatBranch(row: BankDepositSettlementReconciliation): string {
  const code = row.branchCode?.trim()
  const name = row.branchName?.trim()
  if (code && name) return `${code} — ${name}`
  return code ?? name ?? row.branchId
}

export function BankDepositSettlementTable({
  items,
  postingReportId = null,
  onPost,
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
            <th className={financeThSettlementStatus}>Status</th>
            <th className={financeThRight}>Variance</th>
            <th className={financeTh}>Pickup Voucher</th>
            <th className={financeTh}>Deposit Voucher</th>
            <th className={financeTh}>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const showPost = shouldShowBankDepositPostButton(row.status)
            const isPosting = postingReportId === row.collectorReportId
            const actionHint = bankDepositSettlementActionHint(row.status)

            return (
              <tr key={row.collectorReportId}>
                <td className="font-mono text-sm">{row.collectNo}</td>
                <td className="text-sm">{formatBranch(row)}</td>
                <td className="text-sm">{row.mode ?? "—"}</td>
                <td className={financeTdSettlementAmount}>
                  {formatAmount(row.inTransitAmount)}
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
                  {showPost && onPost ? (
                    <button
                      type="button"
                      data-testid={`bank-deposit-post-${row.collectorReportId}`}
                      disabled={isPosting}
                      onClick={() => onPost(row.collectorReportId)}
                      className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {isPosting ? "Posting…" : "Post Deposit"}
                    </button>
                  ) : actionHint ? (
                    <span className="text-xs text-zinc-600">{actionHint}</span>
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
