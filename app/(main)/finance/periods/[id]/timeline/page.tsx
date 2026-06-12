import Link from "next/link"
import { PeriodAuditTimelinePage } from "@/components/finance/PeriodAuditTimelinePage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinancePeriodAuditTimelinePage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="p-8">
      <EntityContextPageHeading
        title="Period audit timeline"
        className="no-print mt-4 text-xl font-semibold"
      />
      <PeriodAuditTimelinePage periodId={id} />
    </main>
  )
}
