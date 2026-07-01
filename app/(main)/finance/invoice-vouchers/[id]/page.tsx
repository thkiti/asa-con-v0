import Link from "next/link"
import { financeAdminContentClass, financeDocumentPageClass } from "@/lib/main-ui/finance-page-layout"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { InvoiceVoucherEditorPage } from "@/components/finance/InvoiceVoucherEditorPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function InvoiceVoucherDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className={financeDocumentPageClass}>
      <FinanceDocumentContainer>
        <Link
          href="/finance/invoice-vouchers"
          className={`text-sm ${themeLinkMuted}`}
        >
          ← Invoice vouchers
        </Link>
        <EntityContextPageHeading
          title="INVOICE"
          className="mt-4 text-xl font-semibold"
        />
        <div className={financeAdminContentClass}>
          <InvoiceVoucherEditorPage mode="edit" entryId={id} />
        </div>
      </FinanceDocumentContainer>
    </main>
  )
}
