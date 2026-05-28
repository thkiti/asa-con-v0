import Link from "next/link"
import { ReconciliationSnapshotCompareClient } from "@/components/finance/ReconciliationSnapshotCompareView"

type PageProps = {
  searchParams: Promise<{ left?: string; right?: string }>
}

export default async function FinanceReconciliationSnapshotComparePage({
  searchParams,
}: PageProps) {
  const { left = "", right = "" } = await searchParams

  return (
    <main className="p-8">
      <Link
        href="/finance/reconciliation/snapshots"
        className="text-sm text-zinc-600 hover:text-zinc-900"
      >
        ← Snapshots
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Compare snapshots</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Side-by-side diff of two frozen captures — payload data only, computed in
        the browser.
      </p>
      <div className="mt-6">
        <ReconciliationSnapshotCompareClient leftId={left} rightId={right} />
      </div>
    </main>
  )
}