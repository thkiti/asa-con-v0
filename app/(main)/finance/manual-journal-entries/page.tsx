import Link from "next/link"
import { ManualJournalEntryListPage } from "@/components/finance/ManualJournalEntryListPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function Page() {
  return (
    <main className="p-8">
      <Link href="/finance" className="text-sm text-zinc-600 underline">
        ← Finance
      </Link>
      <EntityContextPageHeading
        title="Journal entries"
        className="mt-4 text-xl font-semibold"
      />
      <p className="mt-2 text-zinc-600">
        Operational manual journal workflow — draft, submit, confirm, and post to GL.
        Document numbers use type codes (MJV, OPB, etc.) without legal entity prefix.
      </p>
      <div className="mt-6">
        <ManualJournalEntryListPage />
      </div>
    </main>
  )
}
