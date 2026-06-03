"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { getMainMenuGroups } from "@/lib/main-ui/main-menu"
import {
  themeBtnSecondary,
  themeMenuGroup,
  themeMenuGroupTitle,
  themeMenuRowLink,
  themeMenuRowPlanned,
  themeMenuSummary,
  themeMuted,
  themePage,
  themePageTitle,
} from "@/lib/theme/theme-classes"

type MainMenuViewProps = {
  user: SessionUserApi
}

export function MainMenuView({ user }: MainMenuViewProps) {
  const router = useRouter()
  const groups = getMainMenuGroups(user.role)
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
          <h1 className={themePageTitle}>Main Menu</h1>
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

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <section key={group.key} className={themeMenuGroup} aria-label={group.label}>
            <h2 className={themeMenuGroupTitle}>{group.label}</h2>
            <ul className="space-y-0.5">
              {group.items.map((item) =>
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
                    <div
                      aria-disabled="true"
                      className={themeMenuRowPlanned}
                    >
                      <span>{item.label}</span>
                      <span className="text-xs">Planned</span>
                    </div>
                  </li>
                )
              )}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
