import Link from "next/link"
import { CloseEvidencePage } from "@/components/finance/CloseEvidencePage"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinancePeriodCloseEvidencePage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="close-evidence-audit-print p-8">
      <Link
        href="/finance/periods"
        className="no-print text-sm text-zinc-600 hover:text-zinc-900"
      >
        ← Accounting periods
      </Link>
      <h1 className="no-print mt-4 text-xl font-semibold">Close evidence</h1>
      <p className="no-print mt-2 text-sm text-zinc-600">
        Immutable audit record captured when this period was hard closed. Read-only — no live
        reconciliation or checklist rebuild.
      </p>
      <div className="mt-6">
        <CloseEvidencePage periodId={id} />
      </div>
    </main>
  )
}