"use client"

import type { ReactNode } from "react"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { mainMenuPageClass, mainMenuShellBodyClass, mainMenuShellContentClass } from "@/lib/main-ui/main-menu-layout"
import { MainMenuHeader } from "./MainMenuHeader"

type MainMenuShellProps = {
  user: SessionUserApi
  title?: string
  titleClassName?: string
  backHref?: string
  backLabel?: string
  children: ReactNode
}

/** Shell for non-hub pages that need custom body content below the shared header. */
export function MainMenuShell({
  user,
  title = "Main Menu",
  titleClassName,
  backHref,
  backLabel = "← Back to Main Menu",
  children,
}: MainMenuShellProps) {
  return (
    <main className={mainMenuPageClass} data-testid="main-menu-page">
      <div className={mainMenuShellContentClass} data-testid="app-page-container">
        <MainMenuHeader
          user={user}
          title={title}
          titleClassName={titleClassName}
          backHref={backHref}
          backLabel={backLabel}
          layout="shell"
        />
        <div className={mainMenuShellBodyClass}>{children}</div>
      </div>
    </main>
  )
}
