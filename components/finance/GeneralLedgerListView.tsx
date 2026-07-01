import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"
import { GeneralLedgerRefLink } from "@/components/finance/GeneralLedgerRefLink"
import { formatAmount, formatGeneralLedgerDate } from "@/lib/finance-ui/format"
import {
  financeMemo,
  financeNumber,
  financeReportTable,
  financeTableScroll,
  financeTh,
  financeThRight,
} from "@/lib/finance-ui/finance-visual-classes"
import type { GeneralLedgerAccount } from "@/lib/finance-ui/types"

type GeneralLedgerListViewProps = {
  account: GeneralLedgerAccount
  returnTo: string
}

export function GeneralLedgerListView({ account, returnTo }: GeneralLedgerListViewProps) {
  return (
    <div className="general-ledger-list-view" data-testid="gl-list-view">
      <header className="space-y-1">
        <h2 className="text-lg font-medium text-zinc-900">
          <FinanceAccountDisplay
            accountCode={account.accountCode}
            accountName={account.accountName}
            data-testid={`gl-account-${account.accountCode}`}
          />
          <span className="ml-2 text-sm font-normal text-zinc-500">
            ({account.accountType})
          </span>
        </h2>
        <p className="text-sm text-zinc-600">
          Opening balance:{" "}
          <span className="tabular-nums font-medium text-zinc-900">
            {formatAmount(account.openingBalance)}
          </span>
          <span className="ml-3 text-zinc-500">
            Dr {formatAmount(account.openingDebit)} / Cr{" "}
            {formatAmount(account.openingCredit)}
          </span>
        </p>
      </header>

      {account.transactions.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500" data-testid="gl-list-empty">
          No period transactions.
        </p>
      ) : (
        <div className={`mt-3 ${financeTableScroll}`}>
          <table className={financeReportTable}>
            <thead>
              <tr>
                <th className={financeTh}>Date</th>
                <th className={financeTh}>Ref</th>
                <th className={financeThRight}>Debit</th>
                <th className={financeThRight}>Credit</th>
                <th className={financeThRight}>Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {account.transactions.map((tx) => (
                <tr key={tx.journalLineId}>
                  <td className={financeMemo}>{formatGeneralLedgerDate(tx.journalDate)}</td>
                  <td className={financeMemo}>
                    <GeneralLedgerRefLink tx={tx} returnTo={returnTo} />
                  </td>
                  <td className={financeNumber}>{formatAmount(tx.debit)}</td>
                  <td className={financeNumber}>{formatAmount(tx.credit)}</td>
                  <td className={financeNumber}>{formatAmount(tx.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-sm font-medium text-zinc-900" data-testid="gl-list-closing-balance">
        Closing balance:{" "}
        <span className="tabular-nums">{formatAmount(account.closingBalance)}</span>
      </p>
    </div>
  )
}
