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
  backHref?: string
  backLabel?: string
  children: ReactNode
}

export function MasterPageShell({
  title,
  documentEntityCode,
  description,
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
        {description ? (
          <p className={`mt-2 max-w-3xl text-sm ${themeMuted}`}>{description}</p>
        ) : null}
      </header>
      <div className="mt-6">{children}</div>
    </main>
  )
}
