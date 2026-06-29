import { FinanceVoucherInquiryDetailView } from "@/components/finance/FinanceVoucherInquiryDetailView"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: string }>
}

export default async function FinanceVoucherDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params
  const { returnTo } = await searchParams

  return <FinanceVoucherInquiryDetailView voucherId={id} returnTo={returnTo} />
}
