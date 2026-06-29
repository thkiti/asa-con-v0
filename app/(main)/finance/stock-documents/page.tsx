import { StockDocumentInquiryListPage } from "@/components/stock/StockDocumentInquiryListPage"
import { FinanceAdminPageShell } from "@/components/finance/FinanceAdminPageShell"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { financeAdminPageTitleClass } from "@/lib/main-ui/finance-page-layout"

export default function FinanceStockDocumentInquiryPage() {
  return (
    <FinanceAdminPageShell
      backHref="/finance/audit"
      backLabel="← Audit"
      heading={
        <EntityContextPageHeading
          title="Stock Document Inquiry"
          className={financeAdminPageTitleClass}
        />
      }
      intro="Read-only audit center for stock documents — CNT, ADJ, ORD, DEY, ORS, and ORI. Search by period, branch, document type, status, and posting state."
    >
      <StockDocumentInquiryListPage />
    </FinanceAdminPageShell>
  )
}
