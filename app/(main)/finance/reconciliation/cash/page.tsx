import { redirect } from "next/navigation"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { CashReconciliationPage } from "@/components/finance/CashReconciliationPage"
import { getSession } from "@/lib/auth"
import { canAccessFinanceMenu } from "@/lib/main-ui/finance-menu"
import { financeAdminPageClass } from "@/lib/main-ui/finance-page-layout"
import { isHoMainMenuRole } from "@/lib/main-ui/main-menu"

export default async function Page() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  if (!isHoMainMenuRole(session.role) || !canAccessFinanceMenu(session.role)) {
    redirect("/unauthorized")
  }

  return (
    <main className={financeAdminPageClass}>
      <EntityContextPageHeading title="Cash Reconciliation" />
      <CashReconciliationPage />
    </main>
  )
}
