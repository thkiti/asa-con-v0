import Link from "next/link"
import {
  financeAdminContentClass,
  financeAdminIntroClass,
  financeDocumentPageClass,
} from "@/lib/main-ui/finance-page-layout"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { JournalEntryListPage } from "@/components/finance/JournalEntryListPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

export default function Page() {
  return (
    <main className={financeDocumentPageClass}>
      <FinanceDocumentContainer>
        <Link href="/finance" className={`text-sm ${themeLinkMuted}`}>
          ← Finance
        </Link>
        <EntityContextPageHeading title="Manual journals" className="mt-4 text-xl font-semibold" />
        <p className={financeAdminIntroClass}>
          GL-only manual journal entries and reversals. Does not participate in operational
          reconciliation.
        </p>
        <div className={financeAdminContentClass}>
          <JournalEntryListPage />
        </div>
      </FinanceDocumentContainer>
    </main>
  )
}
