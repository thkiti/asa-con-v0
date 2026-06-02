import Link from "next/link"
import { PeriodAuditTimelinePage } from "@/components/finance/PeriodAuditTimelinePage"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinancePeriodAuditTimelinePage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="p-8">
      <PeriodAuditTimelinePage periodId={id} />
    </main>
  )
}
