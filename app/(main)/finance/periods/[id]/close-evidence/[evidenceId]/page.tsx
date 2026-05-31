import Link from "next/link"
import { CloseEvidencePage } from "@/components/finance/CloseEvidencePage"
import { buildCloseEvidenceHistoryPath } from "@/lib/finance-ui/close-evidence"

type PageProps = {
  params: Promise<{ id: string; evidenceId: string }>
}

export default async function FinancePeriodCloseEvidenceByIdPage({ params }: PageProps) {
  const { id, evidenceId } = await params

  return (
    <main className="close-evidence-audit-print p-8">
      <Link
        href="/finance/periods"
        className="no-print text-sm text-zinc-600 hover:text-zinc-900"
      >
        ← Accounting periods
      </Link>
      <Link
        href={buildCloseEvidenceHistoryPath(id)}
        className="no-print ml-4 text-sm text-zinc-600 hover:text-zinc-900"
      >
        Close history
      </Link>
      <h1 className="no-print mt-4 text-xl font-semibold">Close evidence record</h1>
      <p className="no-print mt-2 text-sm text-zinc-600">
        Immutable audit record for a specific HARD close event. Export and print use this loaded
        row only.
      </p>
      <div className="mt-6">
        <CloseEvidencePage periodId={id} evidenceId={evidenceId} />
      </div>
    </main>
  )
}
