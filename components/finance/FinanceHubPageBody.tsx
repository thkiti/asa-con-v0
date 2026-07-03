"use client"

import type { ReactNode } from "react"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import type { MainMenuCardItem } from "@/lib/main-ui/main-menu-card-types"
import { MainMenuDescription } from "@/components/main/MainMenuDescription"
import { MainMenuGrid } from "@/components/main/MainMenuGrid"
import {
  MainMenuGroupedGrids,
  type MainMenuCardGroup,
} from "@/components/main/MainMenuGroupedGrids"
import { MainMenuHeader } from "@/components/main/MainMenuHeader"

type FinanceHubPageBodyProps = {
  user: SessionUserApi
  title: string
  description: ReactNode
  gridAriaLabel: string
  backHref?: string
  backLabel?: string
  items?: readonly MainMenuCardItem[]
  itemGroups?: readonly MainMenuCardGroup[]
}

export function FinanceHubPageBody({
  user,
  title,
  description,
  gridAriaLabel,
  backHref,
  backLabel,
  items = [],
  itemGroups,
}: FinanceHubPageBodyProps) {
  return (
    <>
      <MainMenuHeader
        user={user}
        title={title}
        backHref={backHref}
        backLabel={backLabel}
      />
      <MainMenuDescription>{description}</MainMenuDescription>
      {itemGroups && itemGroups.length > 0 ? (
        <MainMenuGroupedGrids groups={itemGroups} />
      ) : (
        <MainMenuGrid items={items} ariaLabel={gridAriaLabel} />
      )}
    </>
  )
}
