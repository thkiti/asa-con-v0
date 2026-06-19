import { notFound, redirect } from "next/navigation"
import { FinanceMenuHubView } from "@/components/finance/FinanceMenuHubView"
import { getSession } from "@/lib/auth"
import { toSessionUserApi } from "@/lib/auth/session-user-api"
import { branchStaffLandingPath } from "@/lib/main-ui/landing-paths"
import {
  getFinanceMenuHub,
  type FinanceMenuAnyHubKey,
} from "@/lib/main-ui/finance-menu"
import { isHoMainMenuRole } from "@/lib/main-ui/main-menu"

type FinanceHubPageLoaderProps = {
  hubKey: FinanceMenuAnyHubKey
}

export async function FinanceHubPageLoader({ hubKey }: FinanceHubPageLoaderProps) {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  if (!isHoMainMenuRole(session.role)) {
    redirect(branchStaffLandingPath(session.role))
  }

  const hub = getFinanceMenuHub(session.role, hubKey)
  if (!hub) {
    redirect("/unauthorized")
  }

  const hasItems = hub.items.length > 0
  const hasGroups = (hub.itemGroups?.length ?? 0) > 0
  if (!hasItems && !hasGroups) {
    notFound()
  }

  return <FinanceMenuHubView user={toSessionUserApi(session)} hub={hub} />
}
