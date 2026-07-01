import { financeAdminPageClass } from "@/lib/main-ui/finance-page-layout"
import { FinanceDashboardBackLink } from "@/components/finance/FinanceDashboardBackLink"
import { BalanceSheetPage } from "@/components/finance/BalanceSheetPage"
import { FinanceReportContainer } from "@/components/finance/FinanceReportContainer"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function Page() {
  return (
    <main className={financeAdminPageClass}>
      <FinanceDashboardBackLink />
      <EntityContextPageHeading title="Balance Sheet" className="mt-4 text-xl font-semibold" />
      <FinanceReportContainer className="mt-6">
        <BalanceSheetPage />
      </FinanceReportContainer>
    </main>
  )
}
