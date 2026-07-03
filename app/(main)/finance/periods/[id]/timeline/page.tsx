import { FinanceAdminPageShell } from "@/components/finance/FinanceAdminPageShell"
import { PeriodAuditTimelinePage } from "@/components/finance/PeriodAuditTimelinePage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { financeAdminPageTitleClass } from "@/lib/main-ui/finance-page-layout"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinancePeriodAuditTimelinePage({ params }: PageProps) {
  const { id } = await params

  return (
    <FinanceAdminPageShell
      backHref="/finance/periods"
      backLabel="← Accounting periods"
      heading={
        <EntityContextPageHeading
          title="Period audit timeline"
          className={`no-print ${financeAdminPageTitleClass}`}
        />
      }
      intro="Read-only chronological view of period lifecycle, close evidence, reopen workflow, and reopen execution."
    >
      <PeriodAuditTimelinePage periodId={id} />
    </FinanceAdminPageShell>
  )
}
