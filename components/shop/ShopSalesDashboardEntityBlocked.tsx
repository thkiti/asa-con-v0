import { MainMenuShell } from "@/components/main/MainMenuShell"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { mainMenuLargePageTitleClass } from "@/lib/main-ui/main-menu-layout"
import { SHOP_SALES_DASHBOARD_ASAS_ONLY_MESSAGE } from "@/lib/permissions/sales-dashboard"
import { themeMuted } from "@/lib/theme/theme-classes"

type ShopSalesDashboardEntityBlockedProps = {
  user: SessionUserApi
}

export function ShopSalesDashboardEntityBlocked({
  user,
}: ShopSalesDashboardEntityBlockedProps) {
  return (
    <MainMenuShell
      user={user}
      title="LAST MONTH / ACTUAL SALES"
      titleClassName={mainMenuLargePageTitleClass}
      backHref="/main/shop"
      backLabel="← Back to Shop"
    >
      <p
        className={`text-sm ${themeMuted}`}
        role="status"
        data-testid="sales-dashboard-entity-blocked"
      >
        {SHOP_SALES_DASHBOARD_ASAS_ONLY_MESSAGE}
      </p>
    </MainMenuShell>
  )
}
