import Link from "next/link"
import { ReopenEvidencePage } from "@/components/finance/ReopenEvidencePage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

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
      <EntityContextPageHeading title="Reopen evidence" className="mt-4 text-xl font-semibold" />
      <p className="mt-2 text-sm text-zinc-600">
        Audited reopen events with actor snapshot, reason, and status transition.
      </p>
      <div className="mt-6">
        <ReopenEvidencePage periodId={id} />
      </div>
    </main>
  )
}
