"use client"

import { FinanceHubPageBody } from "@/components/finance/FinanceHubPageBody"
import { FinancePageShell } from "@/components/finance/FinancePageShell"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import {
  FINANCE_MENU_HOME_DESCRIPTION,
  getFinanceMenuHomeSections,
} from "@/lib/main-ui/finance-menu"
import { toMainMenuCardItems } from "@/lib/main-ui/main-menu-card-types"

type FinanceMenuViewProps = {
  user: SessionUserApi
}

export function FinanceMenuView({ user }: FinanceMenuViewProps) {
  return (
    <FinancePageShell testId="finance-hub-page">
      <FinanceHubPageBody
        user={user}
        title="Finance"
        description={FINANCE_MENU_HOME_DESCRIPTION}
        backHref="/main"
        backLabel="← Back to Main Menu"
        gridAriaLabel="Finance sections"
        items={toMainMenuCardItems(getFinanceMenuHomeSections(user.role))}
      />
    </FinancePageShell>
  )
}
