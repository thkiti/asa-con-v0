import Link from "next/link"
import { ReconciliationPage } from "@/components/finance/ReconciliationPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

type PageProps = {
  searchParams: Promise<{ branchId?: string; periodKey?: string }>
}

export default async function FinanceReconciliationPage({
  searchParams,
}: PageProps) {
  const { branchId, periodKey } = await searchParams

  return (
    <main className="p-8">
      <Link href="/finance" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Finance
      </Link>
      <EntityContextPageHeading title="Reconciliation" className="mt-4 text-xl font-semibold" />
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
