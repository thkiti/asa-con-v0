import { FinanceAdminPageShell } from "@/components/finance/FinanceAdminPageShell"
import { ReopenEvidencePage } from "@/components/finance/ReopenEvidencePage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { financeAdminPageTitleClass } from "@/lib/main-ui/finance-page-layout"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinancePeriodReopenEvidencePage({ params }: PageProps) {
  const { id } = await params

  return (
    <FinanceAdminPageShell
      backHref="/finance/periods"
      backLabel="← Accounting periods"
      heading={
        <EntityContextPageHeading
          title="Reopen history"
          className={financeAdminPageTitleClass}
        />
      }
      intro="Audited reopen events with actor snapshot, reason, and status transition."
    >
      <ReopenEvidencePage periodId={id} />
    </FinanceAdminPageShell>
  )
}
