import Link from "next/link"
import { RefundsReconciliationView } from "@/components/finance/RefundsReconciliationView"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function RefundsReconciliationPage() {
  return (
    <main className="p-8">
      <Link href="/finance" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Finance
      </Link>
      <EntityContextPageHeading title="Refund reconciliation" className="mt-4 text-xl font-semibold" />
      <p className="mt-2 text-zinc-600">
        Compare operational money-only refunds against POS_REFUND finance postings.
      </p>
      <div className="mt-6">
        <RefundsReconciliationView />
      </div>
    </main>
  )
}
