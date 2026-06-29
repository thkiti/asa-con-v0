import Link from "next/link"
import { financeAdminPageClass } from "@/lib/main-ui/finance-page-layout"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { ManualJournalEntryEditorPage } from "@/components/finance/ManualJournalEntryEditorPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

export default function NewOpeningBalancePage() {
  return (
    <main className={financeAdminPageClass}>
      <FinanceDocumentContainer>
        <Link
          href="/finance/opening-balance"
          className={`text-sm ${themeLinkMuted}`}
        >
          ← Opening balance
        </Link>
        <EntityContextPageHeading
          title="New OPB — Opening balance"
          className="mt-4 text-xl font-semibold"
        />
        <div className="mt-6">
          <ManualJournalEntryEditorPage
            mode="create"
            initialEntryType="OPENING_BALANCE"
            openingBalanceMode
          />
        </div>
      </FinanceDocumentContainer>
    </main>
  )
}
