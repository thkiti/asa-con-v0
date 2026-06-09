import Link from "next/link"
import type { MainMenuCardItem } from "@/lib/main-ui/main-menu-card-types"
import {
  mainMenuCardBadgeClass,
  mainMenuCardClass,
  mainMenuCardHintClass,
  mainMenuCardHintSlotClass,
  mainMenuCardPlannedClass,
  mainMenuCardTitleClass,
  mainMenuCardTitleSlotClass,
} from "@/lib/main-ui/main-menu-layout"

type MainMenuCardProps = {
  item: MainMenuCardItem
}

function MainMenuCardDescription({ hint }: { hint?: string }) {
  return (
    <div className={mainMenuCardHintSlotClass}>
      <span className={mainMenuCardHintClass}>{hint?.trim() ? hint : "\u00A0"}</span>
    </div>
  )
}

export function MainMenuCard({ item }: MainMenuCardProps) {
  if (item.status === "available" && item.href) {
    return (
      <Link
        href={item.href}
        className={`${mainMenuCardClass} cursor-pointer`}
        data-testid="main-menu-card"
      >
        <div className={mainMenuCardTitleSlotClass}>
          <span className={mainMenuCardTitleClass}>{item.label}</span>
        </div>
        <MainMenuCardDescription hint={item.hint} />
      </Link>
    )
  }

  return (
    <div
      aria-disabled="true"
      className={mainMenuCardPlannedClass}
      data-testid="main-menu-card"
    >
      <div className={mainMenuCardTitleSlotClass}>
        <span className={`${mainMenuCardTitleClass} min-w-0 flex-1`}>
          {item.label}
        </span>
        <span className={mainMenuCardBadgeClass}>Planned</span>
      </div>
      <MainMenuCardDescription hint={item.hint} />
    </div>
  )
}
