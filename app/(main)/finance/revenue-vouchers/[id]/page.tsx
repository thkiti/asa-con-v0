import Link from "next/link"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { RevenueVoucherEditorPage } from "@/components/finance/RevenueVoucherEditorPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function RevenueVoucherDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="p-8">
      <FinanceDocumentContainer>
        <Link
          href="/finance/revenue-vouchers"
          className={`text-sm ${themeLinkMuted}`}
        >
          ← Revenue vouchers
        </Link>
        <EntityContextPageHeading
          title="REVENUE VOUCHER"
          className="mt-4 text-xl font-semibold"
        />
        <div className="mt-4">
          <RevenueVoucherEditorPage mode="edit" entryId={id} />
        </div>
      </FinanceDocumentContainer>
    </main>
  )
}
