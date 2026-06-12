import Link from "next/link"
import { ClosingEntryPage } from "@/components/finance/ClosingEntryPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

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
      <EntityContextPageHeading title="Closing entry" className="mt-4 text-xl font-semibold" />
      <p className="mt-2 text-sm text-zinc-600">
        Preview and post the period closing entry while the accounting period is open.
      </p>
      <div className="mt-6">
        <ClosingEntryPage periodId={id} />
      </div>
    </main>
  )
}
