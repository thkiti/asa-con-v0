import { redirect } from "next/navigation"
import { FinanceMenuView } from "@/components/finance/FinanceMenuView"
import { getSession } from "@/lib/auth"
import { toSessionUserApi } from "@/lib/auth/session-user-api"
import { branchStaffLandingPath } from "@/lib/main-ui/landing-paths"
import { canAccessFinanceMenu } from "@/lib/main-ui/finance-menu"
import { isHoMainMenuRole } from "@/lib/main-ui/main-menu"

export default async function FinanceHomePage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  if (!isHoMainMenuRole(session.role)) {
    redirect(branchStaffLandingPath(session.role))
  }

  if (!canAccessFinanceMenu(session.role)) {
    redirect("/unauthorized")
  }

  return <FinanceMenuView user={toSessionUserApi(session)} />
}
