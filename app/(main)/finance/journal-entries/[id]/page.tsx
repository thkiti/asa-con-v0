import { JournalEntryInquiryView } from "@/components/finance/JournalEntryInquiryView"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="p-8">
      <JournalEntryInquiryView journalEntryId={id} />
    </main>
  )
}
