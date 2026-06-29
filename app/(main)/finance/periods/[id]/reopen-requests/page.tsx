import { ReopenRequestsPage } from "@/components/finance/ReopenRequestsPage"
import { FinanceAdminPageShell } from "@/components/finance/FinanceAdminPageShell"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { financeAdminPageTitleClass } from "@/lib/main-ui/finance-page-layout"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinancePeriodReopenRequestsPage({ params }: PageProps) {
  const { id } = await params

  return (
    <FinanceAdminPageShell
      backHref="/finance/periods"
      backLabel="← Accounting periods"
      heading={
        <EntityContextPageHeading
          title="Reopen requests"
          className={financeAdminPageTitleClass}
        />
      }
      intro="Approval workflow for hard-closed period reopen (Phase 21B)."
    >
      <ReopenRequestsPage periodId={id} />
    </FinanceAdminPageShell>
  )
}
