import Link from "next/link"
import type { ManualJournalEntryTypeCode } from "@/lib/finance-ui/manual-journal-entry-display"
import { ManualJournalEntryEditorPage } from "@/components/finance/ManualJournalEntryEditorPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { formatManualJournalEntryTypeLabel } from "@/lib/finance-ui/manual-journal-entry-display"

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
      <Link
        href="/finance/manual-journal-entries"
        className="text-sm text-zinc-600 underline"
      >
        ← Journal entries
      </Link>
      <EntityContextPageHeading
        title={`New ${formatManualJournalEntryTypeLabel(entryType)}`}
        className="mt-4 text-xl font-semibold"
      />
      <div className="mt-6">
        <ManualJournalEntryEditorPage mode="create" initialEntryType={entryType} />
      </div>
    </main>
  )
}
