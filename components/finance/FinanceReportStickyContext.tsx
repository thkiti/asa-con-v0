import {
  financeDiffBalanced,
  financeDiffUnbalanced,
  financeReportStickyContext,
  financeReportStickyDetail,
  financeReportStickyPeriod,
  financeReportStickyStatus,
  financeReportStickyTitle,
} from "@/lib/finance-ui/finance-visual-classes"

export type FinanceReportStatusKind = "balanced" | "unbalanced" | "neutral"

export type FinanceReportStickyContextProps = {
  entityLabel: string
  reportTitle: string
  periodLabel: string
  status?: {
    kind: FinanceReportStatusKind
    label: string
  }
  detailLine?: string
}

function statusClass(kind: FinanceReportStatusKind): string {
  if (kind === "balanced") return `${financeReportStickyStatus} ${financeDiffBalanced}`
  if (kind === "unbalanced") return `${financeReportStickyStatus} ${financeDiffUnbalanced}`
  return financeReportStickyStatus
}

export function FinanceReportStickyContext({
  entityLabel,
  reportTitle,
  periodLabel,
  status,
  detailLine,
}: FinanceReportStickyContextProps) {
  return (
    <header className={financeReportStickyContext} data-testid="finance-report-sticky-context">
      <p className={financeReportStickyTitle}>
        {entityLabel} • {reportTitle}
      </p>
      <p className={financeReportStickyPeriod}>{periodLabel}</p>
      {status ? <p className={statusClass(status.kind)}>{status.label}</p> : null}
      {detailLine ? <p className={financeReportStickyDetail}>{detailLine}</p> : null}
    </header>
  )
}
