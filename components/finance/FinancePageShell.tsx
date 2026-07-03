import type { ReactNode } from "react"
import {
  financePageContentClass,
  financePageShellClass,
} from "@/lib/main-ui/finance-page-layout"

type FinancePageShellProps = {
  children: ReactNode
  /** Defaults to finance-page; use finance-hub-page on /finance hub routes. */
  testId?: string
}

/**
 * Shared Finance page frame: one outer max-width shell and one inner content column.
 * All Finance hub and admin routes must render through this (directly or via FinanceAdminPageShell).
 */
export function FinancePageShell({
  children,
  testId = "finance-page",
}: FinancePageShellProps) {
  return (
    <main className={financePageShellClass} data-testid={testId}>
      <div className={financePageContentClass} data-testid="finance-page-content">
        {children}
      </div>
    </main>
  )
}
