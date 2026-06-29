import Link from "next/link"
import { financeAdminPageClass } from "@/lib/main-ui/finance-page-layout"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { ManualJournalEntryEditorPage } from "@/components/finance/ManualJournalEntryEditorPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function ManualJournalEntryDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className={financeAdminPageClass}>
      <FinanceDocumentContainer>
        <Link
          href="/finance/manual-journal-entries"
          className={`text-sm ${themeLinkMuted}`}
        >
          ← Journal entries
        </Link>
        <EntityContextPageHeading
          title="MANUAL JOURNAL VOUCHER"
          className="mt-4 text-xl font-semibold"
        />
        <div className="mt-4">
          <ManualJournalEntryEditorPage mode="edit" entryId={id} />
        </div>
      </FinanceDocumentContainer>
    </main>
  )
}
