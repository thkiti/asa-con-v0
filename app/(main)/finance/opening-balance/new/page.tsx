import Link from "next/link"
import { ManualJournalEntryEditorPage } from "@/components/finance/ManualJournalEntryEditorPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function NewOpeningBalancePage() {
  return (
    <main className="p-8">
      <Link
        href="/finance/opening-balance"
        className="text-sm text-zinc-600 underline"
      >
        ← Opening balance
      </Link>
      <EntityContextPageHeading
        title="New OPB — Opening balance"
        className="mt-4 text-xl font-semibold"
      />
      <div className="mt-6">
        <ManualJournalEntryEditorPage
          mode="create"
          initialEntryType="OPENING_BALANCE"
          openingBalanceMode
        />
      </div>
    </main>
  )
}
