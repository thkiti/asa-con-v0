import { redirect } from "next/navigation"
import { CollectorPickupSettlementPage } from "@/components/finance/CollectorPickupSettlementPage"
import { FinanceAdminPageShell } from "@/components/finance/FinanceAdminPageShell"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { getSession } from "@/lib/auth"
import { canAccessCollectorPickupSettlementUi } from "@/lib/finance-ui/collector-pickup-settlement"
import { financeAdminPageTitleClass } from "@/lib/main-ui/finance-page-layout"

export default async function FinanceCollectorPickupSettlementPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  if (!canAccessCollectorPickupSettlementUi(session.role)) {
    redirect("/unauthorized")
  }

  return (
    <FinanceAdminPageShell
      backHref="/finance"
      backLabel="← Finance"
      heading={
        <EntityContextPageHeading
          title="Collector pickup settlement"
          className={financeAdminPageTitleClass}
        />
      }
      intro="Review persisted COLLECT reports and post Stage 2 settlement — Dr 1031 Cash in Transit, Cr 1001 Cash in Drawer."
    >
      <CollectorPickupSettlementPage />
    </FinanceAdminPageShell>
  )
}
