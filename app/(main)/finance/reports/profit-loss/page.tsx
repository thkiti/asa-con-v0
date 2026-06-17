import Link from "next/link"
import { FinanceReportContainer } from "@/components/finance/FinanceReportContainer"
import { ProfitLossPage } from "@/components/finance/ProfitLossPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

export default function Page() {
  return (
    <main className="p-8">
      <Link href="/finance" className={`text-sm print:hidden ${themeLinkMuted}`}>
        ← Finance
      </Link>
      <EntityContextPageHeading title="Profit & Loss" className="mt-4 text-xl font-semibold" />
      <FinanceReportContainer className="mt-6">
        <ProfitLossPage />
      </FinanceReportContainer>
    </main>
  )
}
