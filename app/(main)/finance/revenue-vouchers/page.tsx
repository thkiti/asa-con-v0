import Link from "next/link"
import {
  financeAdminContentClass,
  financeAdminIntroClass,
  financeDocumentPageClass,
} from "@/lib/main-ui/finance-page-layout"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { RevenueVoucherListPage } from "@/components/finance/RevenueVoucherListPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

export default function RevenueVouchersPage() {
  return (
    <main className={financeDocumentPageClass}>
      <FinanceDocumentContainer>
        <Link href="/finance/daily-work" className={`text-sm ${themeLinkMuted}`}>
          ← Daily Work
        </Link>
        <EntityContextPageHeading
          title="RECEIVABLE VOUCHERS"
          className="mt-4 text-xl font-semibold"
        />
        <p className={financeAdminIntroClass}>
          REV • RECEIVABLE VOUCHER — inbound receipts to bank or cash, allocate credits, post to GL.
          Document numbers use the REV-YYnnnn format.
        </p>
        <div className={financeAdminContentClass}>
          <RevenueVoucherListPage />
        </div>
      </FinanceDocumentContainer>
    </main>
  )
}
