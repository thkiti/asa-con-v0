import type { ReactNode } from "react"

export const FINANCE_REPORT_MAX_WIDTH_PX = 1100

type FinanceReportContainerProps = {
  children: ReactNode
  className?: string
}

export function FinanceReportContainer({
  children,
  className = "",
}: FinanceReportContainerProps) {
  return (
    <div
      className={`finance-report-container ${className}`.trim()}
      data-testid="finance-report-container"
      data-finance-report-max-width={FINANCE_REPORT_MAX_WIDTH_PX}
    >
      {children}
    </div>
  )
}
