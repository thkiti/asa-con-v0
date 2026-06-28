import { BankDepositSettlementStatusBadge } from "@/components/finance/BankDepositSettlementStatusBadge"
import { PayInSlipIndicator } from "@/components/finance/PayInSlipIndicator"
import type { BankDepositSettlementReconciliation } from "@/lib/finance-ui/bank-deposit-settlement"
import { bankDepositSettlementActionHint } from "@/lib/finance-ui/bank-deposit-settlement-display"
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
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const actionHint = bankDepositSettlementActionHint({
              status: row.status,
              payInSlipMissingWarning: row.payInSlipMissingWarning,
            })
            const slipUploaded = row.payInEvidenceStatus === "UPLOADED"

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
                    onPreview={
                      slipUploaded && row.payInEvidenceUrl && onPreviewPayInSlip
                        ? () => onPreviewPayInSlip(row)
                        : undefined
                    }
                  />
                </td>
                <td className={financeTdSettlementStatus}>
                  <BankDepositSettlementStatusBadge status={row.status} />
                  {actionHint ? (
                    <span className="ml-1 text-xs text-zinc-600">{actionHint}</span>
                  ) : null}
                </td>
                <td className="text-right tabular-nums text-sm">
                  {formatAmount(row.variance)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
