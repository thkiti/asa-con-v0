import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"
import { GeneralLedgerRefLink } from "@/components/finance/GeneralLedgerRefLink"
import {
  financeMemo,
  financeNumber,
  financeReportTable,
  financeTableScroll,
  financeTh,
  financeThRight,
} from "@/lib/finance-ui/finance-visual-classes"
import {
  generalLedgerTAccountTotals,
  splitGeneralLedgerTAccountRows,
  type GeneralLedgerTAccountSideRow,
} from "@/lib/finance-ui/general-ledger-t-account"
import { formatAmount, formatGeneralLedgerDate } from "@/lib/finance-ui/format"
import type { GeneralLedgerAccount } from "@/lib/finance-ui/types"

type GeneralLedgerTAccountViewProps = {
  account: GeneralLedgerAccount
  returnTo: string
}

function TAccountSideTable({
  side,
  title,
  rows,
  returnTo,
  testId,
}: {
  side: "debit" | "credit"
  title: string
  rows: GeneralLedgerTAccountSideRow[]
  returnTo: string
  testId: string
}) {
  const sideClass =
    side === "credit"
      ? "general-ledger-t-account-side general-ledger-t-account-side-credit"
      : "general-ledger-t-account-side general-ledger-t-account-side-debit"

  return (
    <div className={sideClass} data-testid={testId} data-side={side}>
      <h3 className="general-ledger-t-account-heading general-ledger-t-account-side-title mb-2 text-sm font-medium text-zinc-900">
        {title}
      </h3>
      <div className={financeTableScroll}>
        <table className={financeReportTable}>
          <thead>
            <tr>
              <th className={financeTh}>Date</th>
              <th className={financeTh}>Ref</th>
              <th className={financeThRight}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className={financeMemo} colSpan={3}>
                  —
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.journalLineId}>
                  <td className={financeMemo}>{formatGeneralLedgerDate(row.journalDate)}</td>
                  <td className={financeMemo}>
                    <GeneralLedgerRefLink tx={row} returnTo={returnTo} />
                  </td>
                  <td className={financeNumber}>{formatAmount(row.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function GeneralLedgerTAccountView({
  account,
  returnTo,
}: GeneralLedgerTAccountViewProps) {
  const { debitRows, creditRows } = splitGeneralLedgerTAccountRows(account.transactions)
  const totals = generalLedgerTAccountTotals(account)

  return (
    <div className="general-ledger-t-account-view" data-testid="gl-t-account-view">
      <header className="mb-3 space-y-1">
        <h2 className="text-lg font-medium text-zinc-900">
          <FinanceAccountDisplay
            accountCode={account.accountCode}
            accountName={account.accountName}
          />
          <span className="ml-2 text-sm font-normal text-zinc-500">
            ({account.accountType})
          </span>
        </h2>
      </header>

      <div className="general-ledger-t-account-columns">
        <TAccountSideTable
          side="debit"
          title="Debit"
          rows={debitRows}
          returnTo={returnTo}
          testId="gl-t-account-debit"
        />
        <TAccountSideTable
          side="credit"
          title="Credit"
          rows={creditRows}
          returnTo={returnTo}
          testId="gl-t-account-credit"
        />
      </div>

      {account.transactions.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500" data-testid="gl-t-account-empty">
          No period transactions.
        </p>
      ) : null}

      <div
        className="general-ledger-t-account-summary mt-4 space-y-1 text-sm text-zinc-900"
        data-testid="gl-t-account-summary"
      >
        <p>
          Opening balance:{" "}
          <span className="tabular-nums font-medium">{formatAmount(totals.openingBalance)}</span>
        </p>
        <p>
          Total debit:{" "}
          <span className="tabular-nums font-medium" data-testid="gl-t-account-total-debit">
            {formatAmount(String(totals.totalDebit))}
          </span>
        </p>
        <p>
          Total credit:{" "}
          <span className="tabular-nums font-medium" data-testid="gl-t-account-total-credit">
            {formatAmount(String(totals.totalCredit))}
          </span>
        </p>
        <p className="font-medium">
          Closing balance:{" "}
          <span className="tabular-nums" data-testid="gl-t-account-closing-balance">
            {formatAmount(totals.closingBalance)}
          </span>
        </p>
      </div>
    </div>
  )
}
