"use client"

import Link from "next/link"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import type { MainMenuSectionDetail } from "@/lib/main-ui/main-menu"
import {
  themeMenuRowLink,
  themeMenuRowPlanned,
  themeMuted,
} from "@/lib/theme/theme-classes"
import { MainMenuShell } from "./MainMenuShell"

type MainMenuSectionViewProps = {
  user: SessionUserApi
  section: MainMenuSectionDetail
}

export function MainMenuSectionView({ user, section }: MainMenuSectionViewProps) {
  return (
    <MainMenuShell
      user={user}
      title={section.label}
      backHref="/main"
      backLabel="← Back to Main Menu"
    >
      <p className={`mt-6 text-sm ${themeMuted}`}>{section.description}</p>

      <ul className="mt-4 space-y-0.5" aria-label={section.label}>
        {section.items.map((item) =>
          item.status === "available" && item.href ? (
            <li key={item.key}>
              <Link href={item.href} className={themeMenuRowLink}>
                <span className="font-medium">{item.label}</span>
                {item.hint ? (
                  <span className={`mt-0.5 block text-xs ${themeMuted}`}>
                    {item.hint}
                  </span>
                ) : null}
              </Link>
            </li>
          ) : (
            <li key={item.key}>
              <div aria-disabled="true" className={themeMenuRowPlanned}>
                <span>{item.label}</span>
                <span className="text-xs">Planned</span>
              </div>
            </li>
          )
        )}
      </ul>
    </MainMenuShell>
  )
}
