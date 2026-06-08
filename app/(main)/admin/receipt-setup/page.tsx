import { redirect } from "next/navigation"
import { DocumentLayoutSetupPage } from "@/components/admin/DocumentLayoutSetupPage"
import { getSession } from "@/lib/auth"
import { toSessionUserApi } from "@/lib/auth/session-user-api"
import { canAccessMasterDatabase } from "@/lib/permissions/master"

export default async function AdminReceiptSetupPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }
  if (!canAccessMasterDatabase(session.role)) {
    redirect("/unauthorized")
  }

  return <DocumentLayoutSetupPage user={toSessionUserApi(session)} />
}
