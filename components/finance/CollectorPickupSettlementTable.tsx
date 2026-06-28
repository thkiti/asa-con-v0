import { CollectorPickupSettlementStatusBadge } from "@/components/finance/CollectorPickupSettlementStatusBadge"
import type { CollectorPickupSettlementReconciliation } from "@/lib/finance-ui/collector-pickup-settlement"
import {
  collectorPickupSettlementActionHint,
  shouldShowCollectorPickupPostButton,
} from "@/lib/finance-ui/collector-pickup-settlement-display"
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

type CollectorPickupSettlementTableProps = {
  items: CollectorPickupSettlementReconciliation[]
  postingReportId?: string | null
  onPost?: (collectorReportId: string) => void
}

function formatBranch(row: CollectorPickupSettlementReconciliation): string {
  const code = row.branchCode?.trim()
  const name = row.branchName?.trim()
  if (code && name) return `${code} — ${name}`
  return code ?? name ?? row.branchId
}

export function CollectorPickupSettlementTable({
  items,
  postingReportId = null,
  onPost,
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
            <th className={financeTh}>Mode</th>
            <th className={financeThSettlementAmount}>Expected</th>
            <th className={financeThSettlementStatus}>Status</th>
            <th className={financeThRight}>Variance</th>
            <th className={financeTh}>Voucher</th>
            <th className={financeTh}>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const showPost = shouldShowCollectorPickupPostButton(row.status)
            const isPosting = postingReportId === row.collectorReportId
            const actionHint = collectorPickupSettlementActionHint(row.status)

            return (
              <tr key={row.collectorReportId}>
                <td className="font-mono text-sm">{row.collectNo}</td>
                <td className="text-sm">{formatBranch(row)}</td>
                <td className="text-sm">{row.mode ?? "—"}</td>
                <td className={financeTdSettlementAmount}>
                  {formatAmount(row.expectedAmount)}
                </td>
                <td className={financeTdSettlementStatus}>
                  <CollectorPickupSettlementStatusBadge status={row.status} />
                </td>
                <td className="text-right tabular-nums text-sm">
                  {formatAmount(row.variance)}
                </td>
                <td className="font-mono text-sm">{row.voucherNo ?? "—"}</td>
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
