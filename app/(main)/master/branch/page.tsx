import { redirect } from "next/navigation"
import { BranchPage } from "@/components/master/branch/BranchPage"
import { getSession } from "@/lib/auth"
import { canAccessMasterDatabase } from "@/lib/permissions/master"

export default async function MasterBranchPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }
  if (!canAccessMasterDatabase(session.role)) {
    redirect("/unauthorized")
  }

  return <BranchPage />
}
