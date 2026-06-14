import Link from "next/link"
import { ManualJournalEntryEditorPage } from "@/components/finance/ManualJournalEntryEditorPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function ManualJournalEntryDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="p-8">
      <Link
        href="/finance/manual-journal-entries"
        className="text-sm text-zinc-600 underline"
      >
        ← Journal entries
      </Link>
      <EntityContextPageHeading
        title="Journal entry"
        className="mt-4 text-xl font-semibold"
      />
      <div className="mt-6">
        <ManualJournalEntryEditorPage mode="edit" entryId={id} />
      </div>
    </main>
  )
}
