import { redirect } from "next/navigation"
import { ShopSalesDashboardEntityBlocked } from "@/components/shop/ShopSalesDashboardEntityBlocked"
import { TargetSalesDashboardPage } from "@/components/shop/TargetSalesDashboardPage"
import { getSession } from "@/lib/auth/session"
import { toSessionUserApi } from "@/lib/auth/session-user-api"
import {
  canAccessShopSalesDashboard,
  canViewSalesDashboard,
} from "@/lib/permissions/sales-dashboard"

export default async function ShopTargetSalesPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }
  if (!canViewSalesDashboard(session.role)) {
    redirect("/unauthorized")
  }
  if (!canAccessShopSalesDashboard(session.documentEntityCode)) {
    return (
      <ShopSalesDashboardEntityBlocked user={toSessionUserApi(session)} />
    )
  }

  return <TargetSalesDashboardPage user={toSessionUserApi(session)} />
}
