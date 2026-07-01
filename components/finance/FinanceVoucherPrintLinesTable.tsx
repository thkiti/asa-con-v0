import type { FinanceVoucherPrintLine } from "@/lib/finance-ui/finance-voucher-print"
import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"
import { formatAmount } from "@/lib/finance-ui/format"
import {
  financeAccount,
  financeMemo,
  financeNumber,
  financeTable,
  financeTh,
  financeThRight,
  financeTotalLabel,
  financeTotalRow,
  financeTotalRowStrong,
  financeTotalValue,
} from "@/lib/finance-ui/finance-visual-classes"

function formatSideAmount(value: string): string {
  const n = Number(value)
  if (!Number.isFinite(n) || n === 0) return "—"
  return formatAmount(value)
}

type FinanceVoucherPrintLinesTableProps = {
  lines: FinanceVoucherPrintLine[]
  totalDebit: string
  totalCredit: string
  showTotals?: boolean
  lineTestIdPrefix?: string
}

export function FinanceVoucherPrintLinesTable({
  lines,
  totalDebit,
  totalCredit,
  showTotals = true,
  lineTestIdPrefix = "finance-voucher-line-account",
}: FinanceVoucherPrintLinesTableProps) {
  return (
    <table
      className={`${financeTable} finance-voucher-lines-table w-full`}
      data-testid="finance-voucher-lines-table"
    >
      <thead data-testid="finance-voucher-lines-table-header">
        <tr className="finance-voucher-lines-col-header">
          <th className={`${financeTh} finance-voucher-account-col`}>Account</th>
          <th className={financeThRight}>Debit</th>
          <th className={financeThRight}>Credit</th>
          <th className={`${financeTh} finance-voucher-line-desc-col`}>Line Description</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <tr key={line.lineNo}>
            <td className={`${financeAccount} finance-voucher-account-col`}>
              <FinanceAccountDisplay
                accountCode={line.accountCode}
                accountName={line.accountName}
                data-testid={`${lineTestIdPrefix}-${line.lineNo}`}
              />
            </td>
            <td className={financeNumber}>{formatSideAmount(line.debit)}</td>
            <td className={financeNumber}>{formatSideAmount(line.credit)}</td>
            <td className={`${financeMemo} finance-voucher-line-desc-col`}>
              {line.lineDescription?.trim() || "—"}
            </td>
          </tr>
        ))}
      </tbody>
      {showTotals ? (
        <tfoot>
          <tr className={financeTotalRow}>
            <td className={financeTotalLabel}>Total Debit</td>
            <td className={financeTotalValue} data-testid="finance-voucher-total-debit">
              {formatAmount(totalDebit)}
            </td>
            <td />
            <td />
          </tr>
          <tr className={financeTotalRowStrong}>
            <td className={financeTotalLabel}>Total Credit</td>
            <td />
            <td className={financeTotalValue} data-testid="finance-voucher-total-credit">
              {formatAmount(totalCredit)}
            </td>
            <td />
          </tr>
        </tfoot>
      ) : null}
    </table>
  )
}
