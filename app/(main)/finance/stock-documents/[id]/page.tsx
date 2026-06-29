import { StockDocumentInquiryDetailView } from "@/components/stock/StockDocumentInquiryDetailView"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: string }>
}

export default async function FinanceStockDocumentInquiryDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params
  const { returnTo } = await searchParams

  return <StockDocumentInquiryDetailView documentId={id} returnTo={returnTo} />
}
