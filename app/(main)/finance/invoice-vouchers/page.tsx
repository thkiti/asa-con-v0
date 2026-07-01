import Link from "next/link"
import {
  financeAdminContentClass,
  financeAdminIntroClass,
  financeDocumentPageClass,
} from "@/lib/main-ui/finance-page-layout"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { InvoiceVoucherListPage } from "@/components/finance/InvoiceVoucherListPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

export default function InvoiceVouchersPage() {
  return (
    <main className={financeDocumentPageClass}>
      <FinanceDocumentContainer>
        <Link href="/finance/daily-work" className={`text-sm ${themeLinkMuted}`}>
          ← Daily Work
        </Link>
        <EntityContextPageHeading
          title="INVOICES"
          className="mt-4 text-xl font-semibold"
        />
        <p className={financeAdminIntroClass}>
          INV • INVOICE — finance invoices with due dates and customer counterparties.
          Document numbers use the INV-YYnnnn format.
        </p>
        <div className={financeAdminContentClass}>
          <InvoiceVoucherListPage />
        </div>
      </FinanceDocumentContainer>
    </main>
  )
}
