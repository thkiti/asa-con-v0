import Link from "next/link"
import { ManualJournalEntryEditorPage } from "@/components/finance/ManualJournalEntryEditorPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function OpeningBalanceDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="p-8">
      <Link
        href="/finance/opening-balance"
        className="text-sm text-zinc-600 underline"
      >
        ← Opening balance
      </Link>
      <EntityContextPageHeading
        title="OPB — Opening balance"
        className="mt-4 text-xl font-semibold"
      />
      <div className="mt-6">
        <ManualJournalEntryEditorPage
          mode="edit"
          entryId={id}
          initialEntryType="OPENING_BALANCE"
          openingBalanceMode
        />
      </div>
    </main>
  )
}
