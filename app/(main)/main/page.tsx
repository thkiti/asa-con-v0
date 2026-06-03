import { redirect } from "next/navigation"
import { MainMenuView } from "@/components/main/MainMenuView"
import { getSession } from "@/lib/auth"
import { toSessionUserApi } from "@/lib/auth/session-user-api"

export default async function MainMenuPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  return <MainMenuView user={toSessionUserApi(session)} />
}
