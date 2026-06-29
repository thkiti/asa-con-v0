import { JournalEntryInquiryView } from "@/components/finance/JournalEntryInquiryView"
import { financeAdminPageClass } from "@/lib/main-ui/finance-page-layout"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: string }>
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <main className={financeAdminPageClass}>
      <JournalEntryInquiryView journalEntryId={id} returnTo={returnTo} />
    </main>
  )
}
