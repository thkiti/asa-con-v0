"use client"

import type { ReactNode } from "react"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import type { MainMenuCardItem } from "@/lib/main-ui/main-menu-card-types"
import { mainMenuPageClass } from "@/lib/main-ui/main-menu-layout"
import { MainMenuDescription } from "./MainMenuDescription"
import { MainMenuGrid } from "./MainMenuGrid"
import { MainMenuHeader } from "./MainMenuHeader"

export type MainMenuHubPageProps = {
  user: SessionUserApi
  title: string
  description: ReactNode
  items: readonly MainMenuCardItem[]
  gridAriaLabel: string
  backHref?: string
  backLabel?: string
}

export function MainMenuHubPage({
  user,
  title,
  description,
  items,
  gridAriaLabel,
  backHref,
  backLabel,
}: MainMenuHubPageProps) {
  return (
    <main className={mainMenuPageClass} data-testid="main-menu-page">
      <MainMenuHeader
        user={user}
        title={title}
        backHref={backHref}
        backLabel={backLabel}
      />
      <MainMenuDescription>{description}</MainMenuDescription>
      <MainMenuGrid items={items} ariaLabel={gridAriaLabel} />
    </main>
  )
}
