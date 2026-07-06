import { PeriodAdminPage } from "@/components/finance/PeriodAdminPage"
import { FinanceAdminPageShell } from "@/components/finance/FinanceAdminPageShell"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { financeAdminPageTitleClass } from "@/lib/main-ui/finance-page-layout"
import { isFinanceManualPeriodCreationEnabled } from "@/lib/finance/config"

export default function FinancePeriodsPage() {
  return (
    <FinanceAdminPageShell
      backHref="/finance/accounting-periods"
      backLabel="← Month-End Closing"
      heading={
        <EntityContextPageHeading
          title="Accounting periods"
          className={financeAdminPageTitleClass}
        />
      }
      intro="Review accounting period status. Close and reopen actions are available on each period's review page."
    >
      <PeriodAdminPage
        manualPeriodCreationEnabled={isFinanceManualPeriodCreationEnabled()}
      />
    </FinanceAdminPageShell>
  )
}
