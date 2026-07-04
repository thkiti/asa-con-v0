import Link from "next/link"
import {
  financeAdminContentClass,
  financeAdminIntroClass,
  financeDocumentPageClass,
} from "@/lib/main-ui/finance-page-layout"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { PaymentVoucherListPage } from "@/components/finance/PaymentVoucherListPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { parseDocumentEntityCode } from "@/lib/legal-entity"
import { getSession } from "@/lib/auth"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function PaymentVouchersPage({ searchParams }: PageProps) {
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
          title="PAYMENT VOUCHERS"
          legalEntityCode={legalEntityCode}
          className="mt-4 text-xl font-semibold"
        />
        <p className={financeAdminIntroClass}>
          PAV • PAYMENT VOUCHER — outbound payments, cheques, and settlement disbursements.
          Document numbers use the PAV-YYnnnn format.
        </p>
        <div className={financeAdminContentClass}>
          <PaymentVoucherListPage />
        </div>
      </FinanceDocumentContainer>
    </main>
  )
}
