import Link from "next/link"

export default function Page() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Finance</h1>
      <p className="mt-2 text-zinc-600">
        Reconciliation, periods, chart of accounts, and GL reporting.
      </p>
      <ul className="mt-6 space-y-3">
        <li>
          <Link
            href="/finance/reports/trial-balance"
            className="text-zinc-900 underline hover:text-zinc-600"
          >
            Trial balance
          </Link>
        </li>
        <li>
          <Link
            href="/finance/reports/general-ledger"
            className="text-zinc-900 underline hover:text-zinc-600"
          >
            General ledger
          </Link>
        </li>
        <li>
          <Link
            href="/finance/reports/profit-loss"
            className="text-zinc-900 underline hover:text-zinc-600"
          >
            Profit &amp; loss
          </Link>
        </li>
        <li>
          <Link
            href="/finance/reports/balance-sheet"
            className="text-zinc-900 underline hover:text-zinc-600"
          >
            Balance sheet
          </Link>
        </li>
        <li>
          <Link
            href="/finance/journal-entries"
            className="text-zinc-900 underline hover:text-zinc-600"
          >
            Manual journals
          </Link>
        </li>
        <li>
          <Link
            href="/finance/journal-entries/new"
            className="text-zinc-900 underline hover:text-zinc-600"
          >
            New manual journal
          </Link>
        </li>
        <li>
          <Link
            href="/finance/accounts"
            className="text-zinc-900 underline hover:text-zinc-600"
          >
            Chart of accounts
          </Link>
        </li>
        <li>
          <Link
            href="/finance/accounts/import"
            className="text-zinc-900 underline hover:text-zinc-600"
          >
            Import chart of accounts (CSV)
          </Link>
        </li>
        <li>
          <Link
            href="/finance/reconciliation"
            className="text-zinc-900 underline hover:text-zinc-600"
          >
            Reconciliation dashboard
          </Link>
        </li>
        <li>
          <Link
            href="/finance/reconciliation/inventory"
            className="text-zinc-900 underline hover:text-zinc-600"
          >
            Inventory reconciliation
          </Link>
        </li>
        <li>
          <Link
            href="/finance/reconciliation/sales"
            className="text-zinc-900 underline hover:text-zinc-600"
          >
            Sales reconciliation
          </Link>
        </li>
        <li>
          <Link
            href="/finance/reconciliation/refunds"
            className="text-zinc-900 underline hover:text-zinc-600"
          >
            Refund reconciliation
          </Link>
        </li>
        <li>
          <Link
            href="/finance/reconciliation/snapshots"
            className="text-zinc-900 underline hover:text-zinc-600"
          >
            Reconciliation snapshots
          </Link>
        </li>
        <li>
          <Link
            href="/finance/periods"
            className="text-zinc-900 underline hover:text-zinc-600"
          >
            Period admin
          </Link>
        </li>
      </ul>
    </main>
  )
}
