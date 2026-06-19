import { JournalEntryInquiryView } from "@/components/finance/JournalEntryInquiryView"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: string }>
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <main className="p-8">
      <JournalEntryInquiryView journalEntryId={id} returnTo={returnTo} />
    </main>
  )
}
