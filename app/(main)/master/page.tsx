import { redirect } from "next/navigation"
import { MasterHubView } from "@/components/master/MasterHubView"
import { getSession } from "@/lib/auth"
import { toSessionUserApi } from "@/lib/auth/session-user-api"
import { canAccessMasterDatabase } from "@/lib/permissions/master"

export default async function MasterDatabasePage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }
  if (!canAccessMasterDatabase(session.role)) {
    redirect("/unauthorized")
  }

  return <MasterHubView user={toSessionUserApi(session)} />
}
