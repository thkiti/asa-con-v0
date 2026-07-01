import { financeAdminPageClass } from "@/lib/main-ui/finance-page-layout"
import { FinanceDashboardBackLink } from "@/components/finance/FinanceDashboardBackLink"
import { FinanceReportContainer } from "@/components/finance/FinanceReportContainer"
import { TrialBalancePage } from "@/components/finance/TrialBalancePage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function Page() {
  return (
    <main className={financeAdminPageClass}>
      <FinanceDashboardBackLink />
      <EntityContextPageHeading title="Trial Balance" className="mt-4 text-xl font-semibold" />
      <FinanceReportContainer className="mt-6">
        <TrialBalancePage />
      </FinanceReportContainer>
    </main>
  )
}
