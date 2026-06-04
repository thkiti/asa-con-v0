import { redirect } from "next/navigation"
import { ReceiptSetupPage } from "@/components/admin/ReceiptSetupPage"
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

  return <ReceiptSetupPage user={toSessionUserApi(session)} />
}
