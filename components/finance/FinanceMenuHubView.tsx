"use client"

import { MainMenuHubPage } from "@/components/main/MainMenuHubPage"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import type { FinanceMenuHub } from "@/lib/main-ui/finance-menu"
import { toFinanceMenuCardItems } from "@/lib/main-ui/main-menu-card-types"

type FinanceMenuHubViewProps = {
  user: SessionUserApi
  hub: FinanceMenuHub
}

export function FinanceMenuHubView({ user, hub }: FinanceMenuHubViewProps) {
  const itemGroups = hub.itemGroups?.map((group) => ({
    key: group.key,
    label: group.label,
    items: toFinanceMenuCardItems(group.items),
  }))

  return (
    <MainMenuHubPage
      user={user}
      title={hub.label}
      description={hub.description}
      backHref="/finance"
      backLabel="← Finance"
      gridAriaLabel={hub.label}
      itemGroups={itemGroups}
      items={itemGroups ? undefined : toFinanceMenuCardItems(hub.items)}
    />
  )
}
