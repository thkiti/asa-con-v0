import Link from "next/link"
import { JournalEntryInquiryView } from "@/components/finance/JournalEntryInquiryView"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="p-8">
      <Link href="/finance/journal-entries" className="text-sm text-zinc-600 underline">
        ← Manual journals
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Journal inquiry</h1>
      <p className="mt-2 text-zinc-600">
        Voucher, journal lines, reversal lineage, and reversal status.
      </p>
      <div className="mt-6">
        <JournalEntryInquiryView journalEntryId={id} />
      </div>
    </main>
  )
}
