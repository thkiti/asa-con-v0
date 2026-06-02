import Link from "next/link"
import { PeriodAuditTimelinePage } from "@/components/finance/PeriodAuditTimelinePage"
import { buildCloseEvidencePath } from "@/lib/finance-ui/close-evidence"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinancePeriodAuditTimelinePage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="p-8">
      <Link
        href="/finance/periods"
        className="text-sm text-zinc-600 hover:text-zinc-900"
      >
         Accounting periods
      </Link>
      <Link
        href={buildCloseEvidencePath(id)}
        className="ml-4 text-sm text-zinc-600 hover:text-zinc-900"
      >
        Close evidence
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Period audit timeline</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Read-only chronological view of period lifecycle, close evidence, reopen workflow, and reopen execution.
      </p>
      <div className="mt-6">
        <PeriodAuditTimelinePage periodId={id} />
      </div>
    </main>
  )
}
