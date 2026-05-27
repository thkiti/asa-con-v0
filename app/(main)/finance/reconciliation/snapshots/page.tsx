import Link from "next/link"
import { ReconciliationSnapshotsPage } from "@/components/finance/ReconciliationSnapshotsPage"

export default function FinanceReconciliationSnapshotsPage() {
  return (
    <main className="p-8">
      <Link
        href="/finance/reconciliation"
        className="text-sm text-zinc-600 hover:text-zinc-900"
      >
        ← Reconciliation
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Reconciliation snapshots</h1>
      <p className="mt-2 text-zinc-600">
        Read-only frozen captures of reconciliation dashboard and transaction
        issues. Notes are visible on each snapshot detail page.
      </p>
      <div className="mt-6">
        <ReconciliationSnapshotsPage />
      </div>
    </main>
  )
}
