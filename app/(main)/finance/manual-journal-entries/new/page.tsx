import Link from "next/link"
import type { ManualJournalEntryTypeCode } from "@/lib/finance-ui/manual-journal-entry-display"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { ManualJournalEntryEditorPage } from "@/components/finance/ManualJournalEntryEditorPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

const ENTRY_TYPES: ManualJournalEntryTypeCode[] = [
  "MANUAL",
  "OPENING_BALANCE",
  "ADJUSTMENT",
  "RECLASS",
  "ACCRUAL",
  "AUDITOR_ADJUSTMENT",
]

type PageProps = {
  searchParams: Promise<{ entryType?: string }>
}

export default async function NewManualJournalEntryPage({ searchParams }: PageProps) {
  const { entryType: rawType } = await searchParams
  const normalized = String(rawType ?? "MANUAL").trim().toUpperCase()
  const entryType = ENTRY_TYPES.includes(normalized as ManualJournalEntryTypeCode)
    ? (normalized as ManualJournalEntryTypeCode)
    : "MANUAL"

  return (
    <main className="p-8">
      <FinanceDocumentContainer>
        <Link
          href="/finance/manual-journal-entries"
          className={`text-sm ${themeLinkMuted}`}
        >
          ← Journal entries
        </Link>
        <EntityContextPageHeading
          title="NEW MANUAL JOURNAL VOUCHER"
          className="mt-4 text-xl font-semibold"
        />
        <div className="mt-4">
          <ManualJournalEntryEditorPage mode="create" initialEntryType={entryType} />
        </div>
      </FinanceDocumentContainer>
    </main>
  )
}
