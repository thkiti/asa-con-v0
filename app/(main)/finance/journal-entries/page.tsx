import Link from "next/link"
import { financeAdminPageClass } from "@/lib/main-ui/finance-page-layout"
import { JournalEntryListPage } from "@/components/finance/JournalEntryListPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function Page() {
  return (
    <main className={financeAdminPageClass}>
      <Link href="/finance" className="text-sm text-zinc-600 underline">
        ← Finance
      </Link>
      <EntityContextPageHeading title="Manual journals" className="mt-4 text-xl font-semibold" />
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
