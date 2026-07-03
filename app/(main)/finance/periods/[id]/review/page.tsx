import { FinanceAdminPageShell } from "@/components/finance/FinanceAdminPageShell"
import { PeriodReviewPage } from "@/components/finance/PeriodReviewPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { financeAdminPageTitleClass } from "@/lib/main-ui/finance-page-layout"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinancePeriodReviewRoutePage({ params }: PageProps) {
  const { id } = await params

  return (
    <FinanceAdminPageShell
      backHref="/finance/periods"
      backLabel="← Accounting periods"
      heading={
        <EntityContextPageHeading
          title="Accounting period review"
          className={financeAdminPageTitleClass}
        />
      }
      intro="Review close readiness, audit history, and perform period close or reopen actions."
    >
      <PeriodReviewPage periodId={id} />
    </FinanceAdminPageShell>
  )
}
