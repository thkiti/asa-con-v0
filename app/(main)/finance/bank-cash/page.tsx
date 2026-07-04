import { redirect } from "next/navigation"
import { BankCashJournalPage } from "@/components/finance/BankCashJournalPage"
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
      <BankCashJournalPage />
    </main>
  )
}
