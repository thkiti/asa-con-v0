import Link from "next/link"
import { ManualJournalEntryPage } from "@/components/finance/ManualJournalEntryPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function Page() {
  return (
    <main className="p-8">
      <Link href="/finance/journal-entries" className="text-sm text-zinc-600 underline">
        ← Manual journals
      </Link>
      <EntityContextPageHeading title="New manual journal" className="mt-4 text-xl font-semibold" />
      <div className="mt-6">
        <ManualJournalEntryPage />
      </div>
    </main>
  )
}
