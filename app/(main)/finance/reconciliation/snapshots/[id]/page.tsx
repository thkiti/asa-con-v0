import Link from "next/link"
import { ReconciliationSnapshotDetailClient } from "@/components/finance/ReconciliationSnapshotDetailView"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinanceReconciliationSnapshotDetailPage({
  params,
}: PageProps) {
  const { id } = await params

  return (
    <main className="p-8">
      <Link
        href="/finance/reconciliation/snapshots"
        className="text-sm text-zinc-600 hover:text-zinc-900"
      >
        ← Snapshots
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Snapshot detail</h1>
      <p className="mt-2 text-zinc-600">
        Frozen reconciliation data captured at a point in time.
      </p>
      <div className="mt-6">
        <ReconciliationSnapshotDetailClient id={id} />
      </div>
    </main>
  )
}
