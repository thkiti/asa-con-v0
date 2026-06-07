"use client"

import Link from "next/link"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import type { MainMenuSectionDetail } from "@/lib/main-ui/main-menu"
import {
  themeMenuAppCard,
  themeMenuAppCardBadge,
  themeMenuAppCardPlanned,
  themeMenuCardHint,
  themeMenuCardTitle,
  themeMenuRowLink,
  themeMenuRowPlanned,
  themeMuted,
} from "@/lib/theme/theme-classes"
import { OperationsHubMenu } from "@/components/operations/OperationsHubMenu"
import { MainMenuShell } from "./MainMenuShell"

type MainMenuSectionViewProps = {
  user: SessionUserApi
  section: MainMenuSectionDetail
}

function ShopSectionMenu({ section }: { section: MainMenuSectionDetail }) {
  return (
    <nav
      className="mt-4 grid gap-3 sm:grid-cols-2"
      aria-label={section.label}
    >
      {section.items.map((item) =>
        item.status === "available" && item.href ? (
          <Link
            key={item.key}
            href={item.href}
            className={`${themeMenuAppCard} cursor-pointer`}
          >
            <span className={themeMenuCardTitle}>{item.label}</span>
            {item.hint ? (
              <span className={`${themeMenuCardHint} mt-auto pt-2`}>
                {item.hint}
              </span>
            ) : null}
          </Link>
        ) : (
          <div
            key={item.key}
            aria-disabled="true"
            className={themeMenuAppCardPlanned}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={themeMenuCardTitle}>{item.label}</span>
              <span className={themeMenuAppCardBadge}>Planned</span>
            </div>
            {item.hint ? (
              <span className={`${themeMenuCardHint} mt-auto pt-2`}>
                {item.hint}
              </span>
            ) : null}
          </div>
        )
      )}
    </nav>
  )
}

function DefaultSectionMenu({ section }: { section: MainMenuSectionDetail }) {
  return (
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
  )
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

      {section.key === "shop" ? (
        <ShopSectionMenu section={section} />
      ) : section.key === "operations" ? (
        <OperationsHubMenu section={section} />
      ) : (
        <DefaultSectionMenu section={section} />
      )}
    </MainMenuShell>
  )
}
