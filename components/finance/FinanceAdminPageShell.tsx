"use client"

import type { ReactNode } from "react"
import {
  PageBackDotButton,
  backTooltipFromLabel,
} from "@/components/ui/PageBackDotButton"
import { FinancePageShell } from "./FinancePageShell"
import {
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">{heading}</div>
        <PageBackDotButton
          fallbackHref={backHref}
          tooltip={backTooltipFromLabel(backLabel)}
          data-testid="finance-admin-back-button"
        />
      </div>
      {intro ? <p className={introClassName}>{intro}</p> : null}
      <div className={bodyClass} data-testid="finance-page-body">
        {children}
      </div>
    </FinancePageShell>
  )
}
