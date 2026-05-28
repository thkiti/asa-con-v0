import Link from "next/link"
import { VoucherDetailView } from "@/components/finance/VoucherDetailView"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinanceVoucherDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="p-8">
      <Link href="/finance/reconciliation">← Reconciliation</Link>
      <h1 className="mt-4 text-xl font-semibold">Voucher trace</h1>
      <p className="mt-2 text-zinc-600">
        Read-only voucher and journal lines for finance audit investigation.
      </p>
      <VoucherDetailView voucherId={id} />
    </main>
  )
}
