import Link from "next/link"
import { SalesReconciliationView } from "@/components/finance/SalesReconciliationView"

export default function SalesReconciliationPage() {
  return (
    <main className="p-8">
      <Link href="/main/finance" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Finance
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Sales reconciliation</h1>
      <p className="mt-2 text-zinc-600">
        Compare operational revenue and tender totals against GL balances.
      </p>
      <div className="mt-6">
        <SalesReconciliationView />
      </div>
    </main>
  )
}
