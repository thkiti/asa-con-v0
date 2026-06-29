import Link from "next/link"
import { financeAdminPageClass } from "@/lib/main-ui/finance-page-layout"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { ManualJournalEntryEditorPage } from "@/components/finance/ManualJournalEntryEditorPage"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function OpeningBalanceDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className={financeAdminPageClass}>
      <FinanceDocumentContainer>
        <Link
          href="/finance/opening-balance"
          className={`text-sm ${themeLinkMuted}`}
        >
          ← Opening balance
        </Link>
        <div className="mt-4">
          <ManualJournalEntryEditorPage
            mode="edit"
            entryId={id}
            initialEntryType="OPENING_BALANCE"
            openingBalanceMode
          />
        </div>
      </FinanceDocumentContainer>
    </main>
  )
}
