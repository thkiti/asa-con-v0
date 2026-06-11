import Link from "next/link"
import { RefundsReconciliationView } from "@/components/finance/RefundsReconciliationView"

export default function RefundsReconciliationPage() {
  return (
    <main className="p-8">
      <Link href="/main/finance" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Finance
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Refund reconciliation</h1>
      <p className="mt-2 text-zinc-600">
        Compare operational money-only refunds against POS_REFUND finance postings.
      </p>
      <div className="mt-6">
        <RefundsReconciliationView />
      </div>
    </main>
  )
}
