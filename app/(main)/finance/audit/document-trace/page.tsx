import { DocumentTracePage } from "@/components/finance/DocumentTracePage"
import { FinanceAdminPageShell } from "@/components/finance/FinanceAdminPageShell"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { financeAdminPageTitleClass } from "@/lib/main-ui/finance-page-layout"

export default function FinanceDocumentTracePage() {
  return (
    <FinanceAdminPageShell
      backHref="/finance/audit"
      backLabel="← Audit"
      heading={
        <EntityContextPageHeading
          title="Document Trace"
          className={financeAdminPageTitleClass}
        />
      }
      intro="Trace a business document through related vouchers, journal entries, and ledger links. Read-only."
    >
      <DocumentTracePage />
    </FinanceAdminPageShell>
  )
}
