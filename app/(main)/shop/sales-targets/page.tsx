import { redirect } from "next/navigation"
import { SalesTargetSetupPage } from "@/components/shop/SalesTargetSetupPage"
import { getSession } from "@/lib/auth/session"
import { toSessionUserApi } from "@/lib/auth/session-user-api"
import {
  canEditSalesTargets,
  canViewSalesTargets,
} from "@/lib/permissions/sales-targets"

export default async function ShopSalesTargetsPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }
  if (!canViewSalesTargets(session.role)) {
    redirect("/unauthorized")
  }

  return (
    <SalesTargetSetupPage
      user={toSessionUserApi(session)}
      canEdit={canEditSalesTargets(session.role)}
    />
  )
}
