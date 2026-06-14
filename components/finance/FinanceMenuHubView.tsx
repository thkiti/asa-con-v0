"use client"

import { MainMenuHubPage } from "@/components/main/MainMenuHubPage"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import type { FinanceMenuHub } from "@/lib/main-ui/finance-menu"
import { toMainMenuCardItems } from "@/lib/main-ui/main-menu-card-types"

type FinanceMenuHubViewProps = {
  user: SessionUserApi
  hub: FinanceMenuHub
}

export function FinanceMenuHubView({ user, hub }: FinanceMenuHubViewProps) {
  return (
    <MainMenuHubPage
      user={user}
      title={hub.label}
      description={hub.description}
      backHref="/finance"
      backLabel="← Finance"
      gridAriaLabel={hub.label}
      items={toMainMenuCardItems(hub.items)}
    />
  )
}
