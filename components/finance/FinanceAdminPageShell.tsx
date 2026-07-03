import Link from "next/link"
import type { ReactNode } from "react"
import { FinancePageShell } from "./FinancePageShell"
import {
  financeAdminBackLinkClass,
  financeAdminContentClass,
  financeAdminIntroClass,
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
  const bodyClass =
    contentClassName ?? (workPanel ? financeWorkPanelClass : financeAdminContentClass)

  return (
    <FinancePageShell testId="finance-admin-page">
      <Link href={backHref} className={financeAdminBackLinkClass}>
        {backLabel}
      </Link>
      {heading}
      {intro ? <p className={introClassName}>{intro}</p> : null}
      <div className={bodyClass} data-testid="finance-page-body">
        {children}
      </div>
    </FinancePageShell>
  )
}
