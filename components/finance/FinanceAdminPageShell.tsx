import Link from "next/link"
import type { ReactNode } from "react"
import {
  appPageContainerClass,
  financeAdminBackLinkClass,
  financeAdminContentClass,
  financeAdminIntroClass,
  financeAdminPageClass,
  financeWorkPanelClass,
} from "@/lib/main-ui/finance-page-layout"

type FinanceAdminPageShellProps = {
  backHref: string
  backLabel: string
  heading: ReactNode
  intro?: ReactNode
  children: ReactNode
  /** Use a narrower centered panel for compact settlement-style workflows. */
  workPanel?: boolean
  introClassName?: string
  contentClassName?: string
}

export function FinanceAdminPageShell({
  backHref,
  backLabel,
  heading,
  intro,
  children,
  workPanel = false,
  introClassName = financeAdminIntroClass,
  contentClassName,
}: FinanceAdminPageShellProps) {
  const contentClass =
    contentClassName ?? (workPanel ? financeWorkPanelClass : financeAdminContentClass)

  return (
    <main className={financeAdminPageClass} data-testid="finance-admin-page">
      <div className={appPageContainerClass} data-testid="app-page-container">
        <Link href={backHref} className={financeAdminBackLinkClass}>
          {backLabel}
        </Link>
        {heading}
        {intro ? <p className={introClassName}>{intro}</p> : null}
        <div className={contentClass}>{children}</div>
      </div>
    </main>
  )
}
