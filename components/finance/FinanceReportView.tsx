import type { ReactNode } from "react"
import { financeReportView } from "@/lib/finance-ui/finance-visual-classes"

type FinanceReportViewProps = {
  children: ReactNode
  className?: string
  reportClassName?: string
}

/** Report body wrapper — enables sticky context + column headers on page scroll. */
export function FinanceReportView({
  children,
  className = "",
  reportClassName = "",
}: FinanceReportViewProps) {
  return (
    <div
      className={`${financeReportView} ${reportClassName} ${className}`.trim()}
      data-testid="finance-report-view"
    >
      {children}
    </div>
  )
}
