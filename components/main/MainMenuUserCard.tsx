import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { mainMenuProfileClass } from "@/lib/main-ui/main-menu-layout"
import { themeMuted } from "@/lib/theme/theme-classes"
import { SessionEntityControl } from "./SessionEntityControl"

type MainMenuUserCardProps = {
  user: SessionUserApi
}

export function MainMenuUserCard({ user }: MainMenuUserCardProps) {
  return (
    <section className={mainMenuProfileClass} data-testid="main-menu-user-card">
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
      <SessionEntityControl user={user} />
    </section>
  )
}
