import Link from "next/link"
import {
  financeAdminContentClass,
  financeAdminIntroClass,
  financeDocumentPageClass,
} from "@/lib/main-ui/finance-page-layout"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { InvoiceVoucherListPage } from "@/components/finance/InvoiceVoucherListPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { parseDocumentEntityCode } from "@/lib/legal-entity"
import { getSession } from "@/lib/auth"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function InvoiceVouchersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const session = await getSession()
  const legalEntityCode =
    parseDocumentEntityCode(params.legalEntityCode) ?? session?.documentEntityCode ?? null

  return (
    <main className={financeDocumentPageClass}>
      <FinanceDocumentContainer>
        <Link href="/finance/daily-work" className={`text-sm ${themeLinkMuted}`}>
          ← Daily Work
        </Link>
        <EntityContextPageHeading
          title="INVOICES"
          legalEntityCode={legalEntityCode}
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
