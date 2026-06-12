import Link from "next/link"
import { ReconciliationSnapshotCompareClient } from "@/components/finance/ReconciliationSnapshotCompareView"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

type PageProps = {
  searchParams: Promise<{ left?: string; right?: string }>
}

export default async function FinanceReconciliationSnapshotComparePage({
  searchParams,
}: PageProps) {
  const { left = "", right = "" } = await searchParams

  return (
    <main className="p-8 reconciliation-audit-print">
      <Link
        href="/finance/reconciliation/snapshots"
        className="no-print text-sm text-zinc-600 hover:text-zinc-900"
      >
        ← Snapshots
      </Link>
      <EntityContextPageHeading title="Compare snapshots" className="no-print mt-4 text-xl font-semibold" />
      <p className="no-print mt-2 text-sm text-zinc-600">
        Side-by-side diff of two frozen captures — payload data only, computed in
        the browser.
      </p>
      <div className="mt-6">
        <ReconciliationSnapshotCompareClient leftId={left} rightId={right} />
      </div>
    </main>
  )
}