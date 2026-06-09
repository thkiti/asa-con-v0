"use client"

import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { getMainMenuSections } from "@/lib/main-ui/main-menu"
import { MainMenuHubPage } from "./MainMenuHubPage"

type MainMenuViewProps = {
  user: SessionUserApi
}

export function MainMenuView({ user }: MainMenuViewProps) {
  const sections = getMainMenuSections(user.role)

  return (
    <MainMenuHubPage
      user={user}
      title="Main Menu"
      description="Head Office control center — choose an area to manage or monitor."
      gridAriaLabel="Main Menu sections"
      items={sections.map((section) => ({
        key: section.key,
        label: section.label,
        hint: section.description,
        href: section.href,
        status: "available" as const,
      }))}
    />
  )
}
