import Link from "next/link"
import { financeAdminPageClass } from "@/lib/main-ui/finance-page-layout"
import { FinanceReportContainer } from "@/components/finance/FinanceReportContainer"
import { RetainedEarningsPage } from "@/components/finance/RetainedEarningsPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

export default function Page() {
  return (
    <main className={financeAdminPageClass}>
      <Link href="/finance" className={`text-sm print:hidden ${themeLinkMuted}`}>
        ← Finance
      </Link>
      <EntityContextPageHeading title="Retained Earnings" className="mt-4 text-xl font-semibold" />
      <FinanceReportContainer className="mt-6">
        <RetainedEarningsPage />
      </FinanceReportContainer>
    </main>
  )
}
