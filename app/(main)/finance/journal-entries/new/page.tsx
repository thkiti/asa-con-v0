import Link from "next/link"
import { ManualJournalEntryPage } from "@/components/finance/ManualJournalEntryPage"

export default function Page() {
  return (
    <main className="p-8">
      <Link href="/finance/journal-entries" className="text-sm text-zinc-600 underline">
        ← Manual journals
      </Link>
      <h1 className="mt-4 text-xl font-semibold">New manual journal</h1>
      <div className="mt-6">
        <ManualJournalEntryPage />
      </div>
    </main>
  )
}
