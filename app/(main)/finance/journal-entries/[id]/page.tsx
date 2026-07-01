import { JournalEntryInquiryView } from "@/components/finance/JournalEntryInquiryView"
import { financeDocumentPageClass } from "@/lib/main-ui/finance-page-layout"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: string }>
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <main className={financeDocumentPageClass}>
      <JournalEntryInquiryView journalEntryId={id} returnTo={returnTo} />
    </main>
  )
}
