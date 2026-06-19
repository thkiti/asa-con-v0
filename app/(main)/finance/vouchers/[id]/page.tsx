import { VoucherDetailView } from "@/components/finance/VoucherDetailView"

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

  return (
    <main className="p-8">
      <VoucherDetailView voucherId={id} returnTo={returnTo} />
    </main>
  )
}
