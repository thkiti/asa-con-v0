import Link from "next/link"

export default function Page() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Finance</h1>
      <p className="mt-2 text-zinc-600">
        Read-only reconciliation views for operational vs GL totals.
      </p>
      <ul className="mt-6 space-y-3">
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
