import Link from "next/link"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { RevenueVoucherEditorPage } from "@/components/finance/RevenueVoucherEditorPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

export default function NewRevenueVoucherPage() {
  return (
    <main className="p-8">
      <FinanceDocumentContainer>
        <Link
          href="/finance/revenue-vouchers"
          className={`text-sm ${themeLinkMuted}`}
        >
          ← Revenue vouchers
        </Link>
        <EntityContextPageHeading
          title="NEW REVENUE VOUCHER"
          className="mt-4 text-xl font-semibold"
        />
        <div className="mt-4">
          <RevenueVoucherEditorPage mode="create" />
        </div>
      </FinanceDocumentContainer>
    </main>
  )
}
