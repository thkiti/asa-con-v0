import Link from "next/link"
import { ReopenEvidencePage } from "@/components/finance/ReopenEvidencePage"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinancePeriodReopenEvidencePage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="p-8">
      <Link
        href="/finance/periods"
        className="text-sm text-zinc-600 hover:text-zinc-900"
      >
        ← Accounting periods
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Reopen evidence</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Audited reopen events with actor snapshot, reason, and status transition.
      </p>
      <div className="mt-6">
        <ReopenEvidencePage periodId={id} />
      </div>
    </main>
  )
}
