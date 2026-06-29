import { VoucherInquiryListPage } from "@/components/finance/VoucherInquiryListPage"
import { FinanceAdminPageShell } from "@/components/finance/FinanceAdminPageShell"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { financeAdminPageTitleClass } from "@/lib/main-ui/finance-page-layout"

export default function FinanceVoucherInquiryPage() {
  return (
    <FinanceAdminPageShell
      backHref="/finance/audit"
      backLabel="← Audit"
      heading={
        <EntityContextPageHeading
          title="Voucher / Journal Inquiry"
          className={financeAdminPageTitleClass}
        />
      }
      intro="Search posted vouchers and inspect linked journal entries from MJV, collector pickup, PAY-IN, and other finance sources."
    >
      <VoucherInquiryListPage />
    </FinanceAdminPageShell>
  )
}
