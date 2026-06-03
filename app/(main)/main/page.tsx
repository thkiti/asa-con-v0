import { redirect } from "next/navigation"
import { MainMenuView } from "@/components/main/MainMenuView"
import { getSession } from "@/lib/auth"
import { toSessionUserApi } from "@/lib/auth/session-user-api"
import { branchStaffLandingPath } from "@/lib/main-ui/landing-paths"
import { isHoMainMenuRole } from "@/lib/main-ui/main-menu"

export default async function MainMenuPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  if (!isHoMainMenuRole(session.role)) {
    redirect(branchStaffLandingPath(session.role))
  }

  return <MainMenuView user={toSessionUserApi(session)} />
}
