"use client"

import type { ReactNode } from "react"
import {
  PageBackDotButton,
  backTooltipFromLabel,
} from "@/components/ui/PageBackDotButton"
import {
  formatEntityContextTitleOrDefault,
  type DocumentEntityCode,
} from "@/lib/legal-entity"
import {
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
        <div className="flex items-start justify-between gap-3">
          <h1
            className={`min-w-0 ${themePageTitle}`}
            data-testid="entity-context-page-title"
          >
            {displayTitle}
          </h1>
          {backHref ? (
            <PageBackDotButton
              href={backHref}
              tooltip={backTooltipFromLabel(backLabel)}
              data-testid="master-page-back-button"
            />
          ) : null}
        </div>
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
