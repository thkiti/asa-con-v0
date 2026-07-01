import Link from "next/link"
import { financeAdminContentClass, financeDocumentPageClass } from "@/lib/main-ui/finance-page-layout"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { PaymentVoucherEditorPage } from "@/components/finance/PaymentVoucherEditorPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PaymentVoucherDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className={financeDocumentPageClass}>
      <FinanceDocumentContainer>
        <Link
          href="/finance/payment-vouchers"
          className={`text-sm ${themeLinkMuted}`}
        >
          ← Payment vouchers
        </Link>
        <EntityContextPageHeading
          title="PAYMENT VOUCHER"
          className="mt-4 text-xl font-semibold"
        />
        <div className={financeAdminContentClass}>
          <PaymentVoucherEditorPage mode="edit" entryId={id} />
        </div>
      </FinanceDocumentContainer>
    </main>
  )
}
