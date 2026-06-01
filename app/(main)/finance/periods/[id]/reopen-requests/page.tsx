import Link from "next/link"
import { ReopenRequestsPage } from "@/components/finance/ReopenRequestsPage"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinancePeriodReopenRequestsPage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="p-8">
      <Link href="/finance/periods">← Accounting periods</Link>
      <h1 className="mt-4 text-xl font-semibold">Reopen requests</h1>
      <p className="mt-2 text-zinc-600">
        Approval workflow for hard-closed period reopen (Phase 21B).
      </p>
      <div className="mt-6">
        <ReopenRequestsPage periodId={id} />
      </div>
    </main>
  )
}
