import Link from "next/link"
import { CloseReadinessPage } from "@/components/finance/CloseReadinessPage"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinancePeriodCloseReadinessPage({
  params,
}: PageProps) {
  const { id } = await params

  return (
    <main className="p-8">
      <Link href="/finance/periods" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Accounting periods
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Close readiness</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Is this accounting period safe to close? Review reconciliation evidence,
        frozen snapshots, posting lock state, and audit artifacts.
      </p>
      <div className="mt-6">
        <CloseReadinessPage periodId={id} />
      </div>
    </main>
  )
}