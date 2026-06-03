"use client"

import Link from "next/link"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { getMainMenuSections } from "@/lib/main-ui/main-menu"
import {
  themeMenuCard,
  themeMenuCardHint,
  themeMenuCardTitle,
  themeMuted,
} from "@/lib/theme/theme-classes"
import { MainMenuShell } from "./MainMenuShell"

type MainMenuViewProps = {
  user: SessionUserApi
}

export function MainMenuView({ user }: MainMenuViewProps) {
  const sections = getMainMenuSections(user.role)

  return (
    <MainMenuShell user={user}>
      <p className={`mt-6 text-sm ${themeMuted}`}>
        Head Office control center — choose an area to manage or monitor.
      </p>

      <nav
        className="mt-4 grid gap-3 sm:grid-cols-2"
        aria-label="Main Menu sections"
      >
        {sections.map((section) => (
          <Link key={section.key} href={section.href} className={themeMenuCard}>
            <span className={themeMenuCardTitle}>{section.label}</span>
            <span className={themeMenuCardHint}>{section.description}</span>
          </Link>
        ))}
      </nav>
    </MainMenuShell>
  )
}
