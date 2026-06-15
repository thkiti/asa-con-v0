import { notFound, redirect } from "next/navigation"
import { MainMenuSectionView } from "@/components/main/MainMenuSectionView"
import { getSession } from "@/lib/auth"
import { toSessionUserApi } from "@/lib/auth/session-user-api"
import { branchStaffLandingPath } from "@/lib/main-ui/landing-paths"
import {
  getMainMenuSectionDetail,
  isHoMainMenuRole,
  isMainMenuSectionKey,
} from "@/lib/main-ui/main-menu"

type MainMenuSectionPageProps = {
  params: Promise<{ section: string }>
}

export default async function MainMenuSectionPage({
  params,
}: MainMenuSectionPageProps) {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  if (!isHoMainMenuRole(session.role)) {
    redirect(branchStaffLandingPath(session.role))
  }

  const { section: sectionParam } = await params
  if (!isMainMenuSectionKey(sectionParam)) {
    notFound()
  }

  if (sectionParam === "administration") {
    redirect("/master")
  }

  if (sectionParam === "finance") {
    redirect("/finance")
  }

  const section = getMainMenuSectionDetail(
    session.role,
    sectionParam,
    session.documentEntityCode
  )
  if (!section) {
    redirect("/unauthorized")
  }

  return (
    <MainMenuSectionView user={toSessionUserApi(session)} section={section} />
  )
}
