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
          title="Finance Document Inquiry"
          className={financeAdminPageTitleClass}
        />
      }
      intro="Read-only audit center for posted vouchers and in-progress finance documents. Search by period, branch, document type, status, and posting state — no create, edit, post, or repair actions."
    >
      <VoucherInquiryListPage />
    </FinanceAdminPageShell>
  )
}
