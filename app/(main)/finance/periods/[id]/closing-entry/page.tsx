import Link from "next/link"
import { ClosingEntryPage } from "@/components/finance/ClosingEntryPage"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinancePeriodClosingEntryPage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="p-8">
      <Link href="/finance/periods" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Accounting periods
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Closing entry</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Preview and post the period closing entry while the accounting period is open.
      </p>
      <div className="mt-6">
        <ClosingEntryPage periodId={id} />
      </div>
    </main>
  )
}
