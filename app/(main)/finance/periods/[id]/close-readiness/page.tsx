import Link from "next/link"
import { financeAdminPageClass } from "@/lib/main-ui/finance-page-layout"
import { CloseReadinessPage } from "@/components/finance/CloseReadinessPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinancePeriodCloseReadinessPage({
  params,
}: PageProps) {
  const { id } = await params

  return (
    <main className={financeAdminPageClass}>
      <Link href="/finance/periods" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Accounting periods
      </Link>
      <EntityContextPageHeading title="Close readiness" className="mt-4 text-xl font-semibold" />
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