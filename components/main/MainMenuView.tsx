import Link from "next/link"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { getMainMenuItems } from "@/lib/main-ui/main-menu"
import {
  themeMenuCard,
  themeMenuCardHint,
  themeMenuCardTitle,
  themeMenuDisabled,
  themeMenuDisabledText,
  themeMenuSummary,
  themeMuted,
  themePage,
} from "@/lib/theme/theme-classes"

type MainMenuViewProps = {
  user: SessionUserApi
}

export function MainMenuView({ user }: MainMenuViewProps) {
  const items = getMainMenuItems(user.role)

  return (
    <main className={`mx-auto max-w-3xl p-8 ${themePage}`}>
      <h1 className="text-xl font-semibold">Main Menu</h1>

      <section className={`mt-4 text-sm ${themeMenuSummary}`}>
        <p>
          <span className="font-medium">{user.name}</span>
          <span className={themeMuted}> · {user.staffId}</span>
        </p>
        <p className="mt-1">
          <span className="font-medium">{user.role}</span>
          {user.branchCode ? (
            <span className={themeMuted}>
              {" "}
              · {user.branchCode}
              {user.branchName ? ` (${user.branchName})` : ""}
            </span>
          ) : null}
        </p>
      </section>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {items.map((item) =>
          item.status === "available" && item.href ? (
            <li key={item.key}>
              <Link href={item.href} className={themeMenuCard}>
                <span className={themeMenuCardTitle}>{item.label}</span>
                {item.hint ? (
                  <span className={themeMenuCardHint}>{item.hint}</span>
                ) : null}
              </Link>
            </li>
          ) : (
            <li key={item.key}>
              <div aria-disabled="true" className={themeMenuDisabled}>
                <span className={themeMenuDisabledText}>{item.label}</span>
                <span className={`mt-1 block text-xs ${themeMuted}`}>
                  Coming soon
                </span>
              </div>
            </li>
          )
        )}
      </ul>
    </main>
  )
}
