import type { MainMenuCardItem } from "@/lib/main-ui/main-menu-card-types"
import { mainMenuGridClass } from "@/lib/main-ui/main-menu-layout"
import { MainMenuCard } from "./MainMenuCard"

type MainMenuGridProps = {
  items: readonly MainMenuCardItem[]
  ariaLabel: string
}

export function MainMenuGrid({ items, ariaLabel }: MainMenuGridProps) {
  return (
    <nav
      className={mainMenuGridClass}
      aria-label={ariaLabel}
      data-testid="main-menu-grid"
    >
      {items.map((item) => (
        <MainMenuCard key={item.key} item={item} />
      ))}
    </nav>
  )
}
