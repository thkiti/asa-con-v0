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
    <main className="p-8 reconciliation-audit-print">
      <Link
        href="/finance/reconciliation/snapshots"
        className="no-print text-sm text-zinc-600 hover:text-zinc-900"
      >
        ← Snapshots
      </Link>
      <h1 className="no-print mt-4 text-xl font-semibold">Snapshot detail</h1>
      <p className="no-print mt-2 text-sm text-zinc-600">
        Immutable frozen capture — dashboard rows and transaction issues from
        payload only.
      </p>
      <div className="mt-6">
        <ReconciliationSnapshotDetailClient id={id} />
      </div>
    </main>
  )
}