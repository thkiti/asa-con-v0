import Link from "next/link"
import { ReconciliationPage } from "@/components/finance/ReconciliationPage"

export default function FinanceReconciliationPage() {
  return (
    <main className="p-8">
      <Link href="/finance" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Finance
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Reconciliation</h1>
      <p className="mt-2 text-zinc-600">
        Read-only operational vs GL comparison. No adjustments or journal posting
        from this view.
      </p>
      <div className="mt-6">
        <ReconciliationPage />
      </div>
    </main>
  )
}
