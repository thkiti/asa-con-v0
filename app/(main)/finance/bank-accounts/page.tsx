import { redirect } from "next/navigation"
import { BankAccountsPage } from "@/components/finance/bank-accounts/BankAccountsPage"
import { getSession } from "@/lib/auth"
import { canAccessFinanceMenu } from "@/lib/main-ui/finance-menu"
import { isHoMainMenuRole } from "@/lib/main-ui/main-menu"

export default async function Page() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  if (!isHoMainMenuRole(session.role) || !canAccessFinanceMenu(session.role)) {
    redirect("/unauthorized")
  }

  return <BankAccountsPage />
}
