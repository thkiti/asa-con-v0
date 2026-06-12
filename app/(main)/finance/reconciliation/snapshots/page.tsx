import Link from "next/link"
import { ReconciliationSnapshotsPage } from "@/components/finance/ReconciliationSnapshotsPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

type PageProps = {
  searchParams: Promise<{ branchId?: string }>
}

export default async function FinanceReconciliationSnapshotsPage({
  searchParams,
}: PageProps) {
  const { branchId } = await searchParams

  return (
    <main className="p-8">
      <Link
        href="/finance/reconciliation"
        className="text-sm text-zinc-600 hover:text-zinc-900"
      >
        ← Reconciliation
      </Link>
      <EntityContextPageHeading title="Reconciliation snapshots" className="mt-4 text-xl font-semibold" />
      <p className="mt-2 text-zinc-600">
        Read-only frozen captures of reconciliation dashboard and transaction
        issues. Notes are visible on each snapshot detail page.
      </p>
      <div className="mt-6">
        <ReconciliationSnapshotsPage initialBranchId={branchId} />
      </div>
    </main>
  )
}