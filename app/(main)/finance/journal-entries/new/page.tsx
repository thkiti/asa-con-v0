import Link from "next/link"
import { financeAdminPageClass } from "@/lib/main-ui/finance-page-layout"
import { ManualJournalEntryPage } from "@/components/finance/ManualJournalEntryPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function Page() {
  return (
    <main className={financeAdminPageClass}>
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
