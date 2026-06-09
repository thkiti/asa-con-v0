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
  return (
    <MainMenuHubPage
      user={user}
      title={section.label}
      backHref="/main"
      backLabel="← Back to Main Menu"
      description={section.description}
      gridAriaLabel={section.label}
      items={toMainMenuCardItems(section.items)}
    />
  )
}
