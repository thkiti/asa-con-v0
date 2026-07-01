import Link from "next/link"
import { financeAdminContentClass, financeDocumentPageClass } from "@/lib/main-ui/finance-page-layout"
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
    <main className={financeDocumentPageClass}>
      <FinanceDocumentContainer>
        <Link
          href="/finance/revenue-vouchers"
          className={`text-sm ${themeLinkMuted}`}
        >
          ← Receivable vouchers
        </Link>
        <EntityContextPageHeading
          title="RECEIVABLE VOUCHER"
          className="mt-4 text-xl font-semibold"
        />
        <div className={financeAdminContentClass}>
          <RevenueVoucherEditorPage mode="edit" entryId={id} />
        </div>
      </FinanceDocumentContainer>
    </main>
  )
}
