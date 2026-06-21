import Link from "next/link"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { PettyCashVoucherEditorPage } from "@/components/finance/PettyCashVoucherEditorPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

export default function NewPettyCashVoucherPage() {
  return (
    <main className="p-8">
      <FinanceDocumentContainer>
        <Link
          href="/finance/petty-cash-vouchers"
          className={`text-sm ${themeLinkMuted}`}
        >
          ← Petty cash vouchers
        </Link>
        <EntityContextPageHeading
          title="NEW PETTY CASH VOUCHER"
          className="mt-4 text-xl font-semibold"
        />
        <div className="mt-4">
          <PettyCashVoucherEditorPage mode="create" />
        </div>
      </FinanceDocumentContainer>
    </main>
  )
}
