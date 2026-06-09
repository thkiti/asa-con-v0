import type { ReactNode } from "react"
import { mainMenuIntroClass } from "@/lib/main-ui/main-menu-layout"

type MainMenuDescriptionProps = {
  children: ReactNode
}

export function MainMenuDescription({ children }: MainMenuDescriptionProps) {
  return (
    <p className={mainMenuIntroClass} data-testid="main-menu-description">
      {children}
    </p>
  )
}
