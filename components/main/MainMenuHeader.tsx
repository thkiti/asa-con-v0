"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { formatEntityContextTitle } from "@/lib/legal-entity"
import {
  mainMenuBackLinkClass,
  mainMenuBackLinkSlotClass,
  mainMenuHeaderClass,
  mainMenuLogoutAnchorClass,
  mainMenuLogoutButtonClass,
  mainMenuShellHeaderClass,
  mainMenuTitleClass,
} from "@/lib/main-ui/main-menu-layout"
import { MainMenuUserCard } from "./MainMenuUserCard"

type MainMenuHeaderProps = {
  user: SessionUserApi
  title: string
  titleClassName?: string
  backHref?: string
  backLabel?: string
  /** hub: logout beside title block; shell: logout above full-width content column */
  layout?: "hub" | "shell"
}

export function MainMenuHeader({
  user,
  title,
  titleClassName,
  backHref,
  backLabel = "← Back to Main Menu",
  layout = "hub",
}: MainMenuHeaderProps) {
  const router = useRouter()
  const [logoutPending, setLogoutPending] = useState(false)

  const onLogout = useCallback(async () => {
    setLogoutPending(true)
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" })
      const payload = (await response.json()) as { redirectTo?: string }
      router.push(payload.redirectTo ?? "/login")
      router.refresh()
    } catch {
      router.push("/login")
      router.refresh()
    } finally {
      setLogoutPending(false)
    }
  }, [router])

  const logoutButton = (
    <button
      type="button"
      onClick={() => void onLogout()}
      disabled={logoutPending}
      className={mainMenuLogoutButtonClass}
      data-testid="main-menu-logout"
    >
      {logoutPending ? "กำลัง Logout…" : "Logout"}
    </button>
  )

  const backLink = backHref ? (
    <Link href={backHref} className={mainMenuBackLinkClass}>
      {backLabel}
    </Link>
  ) : (
    <span
      className={`${mainMenuBackLinkClass} invisible select-none`}
      aria-hidden
    >
      {backLabel}
    </span>
  )

  if (layout === "shell") {
    return (
      <header className={mainMenuShellHeaderClass} data-testid="main-menu-header">
        <div className="mb-3 flex justify-end">{logoutButton}</div>
        <div className={mainMenuBackLinkSlotClass}>{backLink}</div>
        <h1
          className={titleClassName ?? mainMenuTitleClass}
          data-testid="main-menu-title"
        >
          {formatEntityContextTitle(user.documentEntityCode, title)}
        </h1>
        <MainMenuUserCard user={user} />
      </header>
    )
  }

  return (
    <header className={mainMenuHeaderClass} data-testid="main-menu-header">
      <div className={mainMenuLogoutAnchorClass}>{logoutButton}</div>
      <div className={mainMenuBackLinkSlotClass}>{backLink}</div>
      <h1
        className={titleClassName ?? mainMenuTitleClass}
        data-testid="main-menu-title"
      >
        {formatEntityContextTitle(user.documentEntityCode, title)}
      </h1>
      <MainMenuUserCard user={user} />
    </header>
  )
}
