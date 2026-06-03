"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useState, type ReactNode } from "react"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import {
  themeBtnSecondary,
  themeLinkMuted,
  themeMenuSummary,
  themeMuted,
  themePage,
  themePageTitle,
} from "@/lib/theme/theme-classes"

type MainMenuShellProps = {
  user: SessionUserApi
  title?: string
  backHref?: string
  backLabel?: string
  children: ReactNode
}

export function MainMenuShell({
  user,
  title = "Main Menu",
  backHref,
  backLabel = "← Back to Main Menu",
  children,
}: MainMenuShellProps) {
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

  return (
    <main className={`mx-auto max-w-5xl p-6 ${themePage}`}>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0 flex-1">
          {backHref ? (
            <Link href={backHref} className={`text-sm ${themeLinkMuted}`}>
              {backLabel}
            </Link>
          ) : null}
          <h1 className={`${backHref ? "mt-3" : ""} ${themePageTitle}`}>
            {title}
          </h1>
          <section className={`mt-3 text-sm ${themeMenuSummary}`}>
            <p>
              <span className="font-medium text-card-foreground">{user.name}</span>
              <span className={themeMuted}> · {user.staffId}</span>
            </p>
            <p className="mt-1 text-card-foreground">
              <span className="font-medium">{user.role}</span>
              {user.branchCode || user.branchName ? (
                <span className={themeMuted}>
                  {" "}
                  · {user.branchCode ?? ""}
                  {user.branchName ? ` (${user.branchName})` : ""}
                </span>
              ) : null}
            </p>
          </section>
        </div>
        <button
          type="button"
          onClick={() => void onLogout()}
          disabled={logoutPending}
          className={themeBtnSecondary}
        >
          {logoutPending ? "กำลัง Logout…" : "Logout"}
        </button>
      </header>

      {children}
    </main>
  )
}
