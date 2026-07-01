import Link from "next/link"
import {
  financeAdminContentClass,
  financeAdminIntroClass,
  financeDocumentPageClass,
} from "@/lib/main-ui/finance-page-layout"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { PettyCashVoucherListPage } from "@/components/finance/PettyCashVoucherListPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

export default function PettyCashVouchersPage() {
  return (
    <main className={financeDocumentPageClass}>
      <FinanceDocumentContainer>
        <Link href="/finance/daily-work" className={`text-sm ${themeLinkMuted}`}>
          ← Daily Work
        </Link>
        <EntityContextPageHeading
          title="Petty cash vouchers"
          className="mt-4 text-xl font-semibold"
        />
        <p className={financeAdminIntroClass}>
          PCV • PETTY CASH — small cash disbursements and replenishment from the locked petty cash account.
          Document numbers use the PCV-YYnnnn format.
        </p>
        <div className={financeAdminContentClass}>
          <PettyCashVoucherListPage />
        </div>
      </FinanceDocumentContainer>
    </main>
  )
}
