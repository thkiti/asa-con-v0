import Link from "next/link"
import type { ReactNode } from "react"
import { SYSTEM_IMPORT_DESCRIPTION } from "@/lib/system-ui/import-entity-config"
import { importButtonSecondaryClass } from "@/lib/system-ui/import-button-styles"

type SystemImportShellProps = {
  title: string
  backHref?: string
  backLabel?: string
  onLogout?: () => void
  logoutPending?: boolean
  children: ReactNode
}

export function SystemImportShell({
  title,
  backHref,
  backLabel = "← System Import",
  onLogout,
  logoutPending = false,
  children,
}: SystemImportShellProps) {
  return (
    <main className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {backHref && backHref.length > 0 ? (
            <Link href={backHref} className="text-sm text-zinc-600 hover:text-zinc-900">
              {backLabel}
            </Link>
          ) : null}
          <h1 className="mt-4 text-xl font-semibold">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">{SYSTEM_IMPORT_DESCRIPTION}</p>
        </div>
        {onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            disabled={logoutPending}
            className={importButtonSecondaryClass}
          >
            {logoutPending ? "กำลัง Logout…" : "Logout"}
          </button>
        ) : null}
      </div>
      <div className="mt-6">{children}</div>
    </main>
  )
}
