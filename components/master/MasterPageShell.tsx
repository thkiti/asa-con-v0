import Link from "next/link"
import type { ReactNode } from "react"
import {
  formatEntityContextTitleOrDefault,
  type DocumentEntityCode,
} from "@/lib/legal-entity"
import {
  themeLinkMuted,
  themeMuted,
  themePage,
  themePageTitle,
} from "@/lib/theme/theme-classes"

type MasterPageShellProps = {
  title: string
  documentEntityCode?: DocumentEntityCode
  description?: string
  headerActions?: ReactNode
  backHref?: string
  backLabel?: string
  children: ReactNode
}

export function MasterPageShell({
  title,
  documentEntityCode,
  description,
  headerActions,
  backHref = "/master",
  backLabel = "← ADMINISTRATION",
  children,
}: MasterPageShellProps) {
  const displayTitle = formatEntityContextTitleOrDefault(
    documentEntityCode,
    title
  )

  return (
    <main className={`mx-auto max-w-6xl p-6 ${themePage}`}>
      <header className="border-b border-border pb-4">
        {backHref ? (
          <Link href={backHref} className={`text-sm ${themeLinkMuted}`}>
            {backLabel}
          </Link>
        ) : null}
        <h1
          className={`mt-3 ${themePageTitle}`}
          data-testid="entity-context-page-title"
        >
          {displayTitle}
        </h1>
        {description && headerActions ? (
          <div className="mt-2 flex items-start justify-between gap-4">
            <p className={`max-w-3xl text-sm ${themeMuted}`}>{description}</p>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
              {headerActions}
            </div>
          </div>
        ) : description ? (
          <p className={`mt-2 max-w-3xl text-sm ${themeMuted}`}>{description}</p>
        ) : headerActions ? (
          <div className="mt-2 flex justify-end gap-1">{headerActions}</div>
        ) : null}
      </header>
      <div className="mt-6">{children}</div>
    </main>
  )
}
