import { PeriodAdminPage } from "@/components/finance/PeriodAdminPage"
import { FinanceAdminPageShell } from "@/components/finance/FinanceAdminPageShell"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { financeAdminPageTitleClass } from "@/lib/main-ui/finance-page-layout"

export default function FinancePeriodsPage() {
  return (
    <FinanceAdminPageShell
      backHref="/finance"
      backLabel="← Finance"
      heading={
        <EntityContextPageHeading
          title="Accounting periods"
          className={financeAdminPageTitleClass}
        />
      }
      intro="Admin setup for accounting period open, close, and reopen."
    >
      <PeriodAdminPage />
    </FinanceAdminPageShell>
  )
}
