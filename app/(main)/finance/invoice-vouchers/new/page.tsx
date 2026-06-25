import Link from "next/link"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { InvoiceVoucherEditorPage } from "@/components/finance/InvoiceVoucherEditorPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

export default function NewInvoiceVoucherPage() {
  return (
    <main className="p-8">
      <FinanceDocumentContainer>
        <Link
          href="/finance/invoice-vouchers"
          className={`text-sm ${themeLinkMuted}`}
        >
          ← Invoice vouchers
        </Link>
        <EntityContextPageHeading
          title="NEW INVOICE VOUCHER"
          className="mt-4 text-xl font-semibold"
        />
        <div className="mt-4">
          <InvoiceVoucherEditorPage mode="create" />
        </div>
      </FinanceDocumentContainer>
    </main>
  )
}
