import Link from "next/link"
import { CloseEvidenceHistoryPage } from "@/components/finance/CloseEvidenceHistoryPage"
import { buildCloseEvidencePath } from "@/lib/finance-ui/close-evidence"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinancePeriodCloseEvidenceHistoryPage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="p-8">
      <Link
        href="/finance/periods"
        className="text-sm text-zinc-600 hover:text-zinc-900"
      >
        ← Accounting periods
      </Link>
      <Link
        href={buildCloseEvidencePath(id)}
        className="ml-4 text-sm text-zinc-600 hover:text-zinc-900"
      >
        Latest close evidence
      </Link>
      <EntityContextPageHeading title="Close evidence history" className="mt-4 text-xl font-semibold" />
      <p className="mt-2 text-sm text-zinc-600">
        All immutable HARD close records for this period, newest first.
      </p>
      <div className="mt-6">
        <CloseEvidenceHistoryPage periodId={id} />
      </div>
    </main>
  )
}
