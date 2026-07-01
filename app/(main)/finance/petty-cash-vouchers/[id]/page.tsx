import Link from "next/link"
import { financeAdminContentClass, financeDocumentPageClass } from "@/lib/main-ui/finance-page-layout"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { PettyCashVoucherEditorPage } from "@/components/finance/PettyCashVoucherEditorPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PettyCashVoucherDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className={financeDocumentPageClass}>
      <FinanceDocumentContainer>
        <Link
          href="/finance/petty-cash-vouchers"
          className={`text-sm ${themeLinkMuted}`}
        >
          ← Petty cash vouchers
        </Link>
        <EntityContextPageHeading
          title="PETTY CASH"
          className="mt-4 text-xl font-semibold"
        />
        <div className={financeAdminContentClass}>
          <PettyCashVoucherEditorPage mode="edit" entryId={id} />
        </div>
      </FinanceDocumentContainer>
    </main>
  )
}
