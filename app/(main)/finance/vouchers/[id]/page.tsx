import { VoucherDetailView } from "@/components/finance/VoucherDetailView"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinanceVoucherDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="p-8">
      <VoucherDetailView voucherId={id} />
    </main>
  )
}
