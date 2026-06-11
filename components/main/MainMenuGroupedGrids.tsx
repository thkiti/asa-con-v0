import type { MainMenuCardItem } from "@/lib/main-ui/main-menu-card-types"
import {
  mainMenuGroupHeadingClass,
  mainMenuGroupSectionClass,
  mainMenuGroupedGridsClass,
} from "@/lib/main-ui/main-menu-layout"
import { MainMenuGrid } from "./MainMenuGrid"

export type MainMenuCardGroup = {
  key: string
  label: string
  items: readonly MainMenuCardItem[]
}

type MainMenuGroupedGridsProps = {
  groups: readonly MainMenuCardGroup[]
}

export function MainMenuGroupedGrids({ groups }: MainMenuGroupedGridsProps) {
  return (
    <div className={mainMenuGroupedGridsClass} data-testid="main-menu-grouped-grids">
      {groups.map((group) => (
        <section key={group.key} className={mainMenuGroupSectionClass}>
          <h2 className={mainMenuGroupHeadingClass}>{group.label}</h2>
          <MainMenuGrid items={group.items} ariaLabel={group.label} />
        </section>
      ))}
    </div>
  )
}
