import Link from "next/link"
import { JournalEntryListPage } from "@/components/finance/JournalEntryListPage"

export default function Page() {
  return (
    <main className="p-8">
      <Link href="/finance" className="text-sm text-zinc-600 underline">
        ← Finance
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Manual journals</h1>
      <p className="mt-2 text-zinc-600">
        GL-only manual journal entries and reversals. Does not participate in operational
        reconciliation.
      </p>
      <div className="mt-6">
        <JournalEntryListPage />
      </div>
    </main>
  )
}
