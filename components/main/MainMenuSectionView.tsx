"use client"

import type { SessionUserApi } from "@/lib/auth/session-user-api"
import type { MainMenuSectionDetail } from "@/lib/main-ui/main-menu"
import { toMainMenuCardItems } from "@/lib/main-ui/main-menu-card-types"
import { MainMenuHubPage } from "./MainMenuHubPage"

type MainMenuSectionViewProps = {
  user: SessionUserApi
  section: MainMenuSectionDetail
}

export function MainMenuSectionView({ user, section }: MainMenuSectionViewProps) {
  const itemGroups = section.itemGroups?.map((group) => ({
    key: group.key,
    label: group.label,
    items: toMainMenuCardItems(group.items),
  }))

  return (
    <MainMenuHubPage
      user={user}
      title={section.label}
      backHref="/main"
      backLabel="← Back to Main Menu"
      description={section.description}
      gridAriaLabel={section.label}
      itemGroups={itemGroups}
      items={itemGroups ? undefined : toMainMenuCardItems(section.items)}
    />
  )
}
