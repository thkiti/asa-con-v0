import { redirect } from "next/navigation"
import { StaffPage } from "@/components/master/staff/StaffPage"
import { getSession } from "@/lib/auth"
import { canAccessMasterDatabase } from "@/lib/permissions/master"

export default async function MasterStaffPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }
  if (!canAccessMasterDatabase(session.role)) {
    redirect("/unauthorized")
  }

  return <StaffPage />
}
