import { redirect } from "next/navigation"
import { OperationsHubView } from "@/components/operations/OperationsHubView"
import { getSession } from "@/lib/auth"
import { toSessionUserApi } from "@/lib/auth/session-user-api"
import { branchStaffLandingPath } from "@/lib/main-ui/landing-paths"
import {
  getMainMenuSectionDetail,
  isHoMainMenuRole,
} from "@/lib/main-ui/main-menu"

export default async function OperationsPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  if (!isHoMainMenuRole(session.role)) {
    redirect(branchStaffLandingPath(session.role))
  }

  const section = getMainMenuSectionDetail(session.role, "operations")
  if (!section) {
    redirect("/unauthorized")
  }

  return (
    <OperationsHubView user={toSessionUserApi(session)} section={section} />
  )
}
