import Link from "next/link"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { getMainMenuItems } from "@/lib/main-ui/main-menu"

type MainMenuViewProps = {
  user: SessionUserApi
}

export function MainMenuView({ user }: MainMenuViewProps) {
  const items = getMainMenuItems(user.role)

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-xl font-semibold text-zinc-900">Main Menu</h1>

      <section className="mt-4 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800">
        <p>
          <span className="font-medium">{user.name}</span>
          <span className="text-zinc-500"> · {user.staffId}</span>
        </p>
        <p className="mt-1">
          <span className="font-medium">{user.role}</span>
          {user.branchCode ? (
            <span className="text-zinc-600">
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
              <Link
                href={item.href}
                className="block rounded border border-zinc-700 bg-white p-3 hover:bg-zinc-50"
              >
                <span className="text-sm font-semibold text-zinc-900">
                  {item.label}
                </span>
                {item.hint ? (
                  <span className="mt-1 block text-xs text-zinc-600">
                    {item.hint}
                  </span>
                ) : null}
              </Link>
            </li>
          ) : (
            <li key={item.key}>
              <div
                aria-disabled="true"
                className="block rounded border border-zinc-200 bg-zinc-100 p-3"
              >
                <span className="text-sm font-semibold text-zinc-500">
                  {item.label}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
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
