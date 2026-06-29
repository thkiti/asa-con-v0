import { VoucherDetailView } from "@/components/finance/VoucherDetailView"
import { financeAdminPageClass } from "@/lib/main-ui/finance-page-layout"

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
    <main className={financeAdminPageClass}>
      <VoucherDetailView voucherId={id} returnTo={returnTo} />
    </main>
  )
}
