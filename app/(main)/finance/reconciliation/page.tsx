import Link from "next/link"
import { ReconciliationPage } from "@/components/finance/ReconciliationPage"

type PageProps = {
  searchParams: Promise<{ branchId?: string; periodKey?: string }>
}

export default async function FinanceReconciliationPage({
  searchParams,
}: PageProps) {
  const { branchId, periodKey } = await searchParams

  return (
    <main className="p-8">
      <Link href="/main/finance" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Finance
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Reconciliation</h1>
      <p className="mt-2 text-zinc-600">
        Read-only operational vs GL comparison. No adjustments or journal posting
        from this view.
      </p>
      <div className="mt-6">
        <ReconciliationPage
          initialBranchId={branchId}
          initialPeriodKey={periodKey}
        />
      </div>
    </main>
  )
}