import {
  formatDashboardBillCount,
  formatDashboardSummaryAmount,
} from "@/lib/shop-ui/compact-form-helpers"
import type { SalesDashboardMonthSummary } from "@/lib/shop/sales-dashboard-types"
import { themeCard, themeMuted } from "@/lib/theme/theme-classes"

const SUMMARY_BOXES = [
  { key: "last-month", label: "Last Month", field: "lastMonthSales" as const, kind: "amount" as const },
  { key: "this-month", label: "This Month", field: "grossSales" as const, kind: "amount" as const },
  { key: "actual-vat", label: "VAT", field: "actualVat" as const, kind: "amount" as const },
  { key: "actual-net", label: "Actual Net", field: "actualNet" as const, kind: "amount" as const },
  { key: "net-sales", label: "Net Sales", field: "netSales" as const, kind: "amount" as const },
  { key: "refund", label: "Refund", field: "refunds" as const, kind: "amount" as const },
  { key: "gross", label: "Gross", field: "grossSales" as const, kind: "amount" as const },
  { key: "bill-count", label: "No. of Bill", field: "billCount" as const, kind: "count" as const },
] as const

type TargetSalesMonthSummaryProps = {
  summary: SalesDashboardMonthSummary
  yearToDate?: boolean
  onYearToDateChange?: (active: boolean) => void
}

export function TargetSalesMonthSummary({
  summary,
  yearToDate = false,
  onYearToDateChange,
}: TargetSalesMonthSummaryProps) {
  return (
    <section
      className={`grid w-full grid-cols-2 gap-2 rounded border border-border px-3 py-3 sm:grid-cols-3 xl:grid-cols-[repeat(8,minmax(0,1fr))_auto] ${themeCard}`}
      data-testid="dashboard-month-summary"
    >
      {SUMMARY_BOXES.map((box) => (
        <div key={box.key} data-testid={`dashboard-summary-${box.key}`}>
          <p
            className={`text-xs uppercase tracking-wide ${themeMuted}`}
            data-testid={`dashboard-summary-label-${box.key}`}
          >
            {box.label}
          </p>
          <p className="text-lg font-semibold tabular-nums">
            {box.kind === "count"
              ? formatDashboardBillCount(summary.billCount)
              : formatDashboardSummaryAmount(summary[box.field])}
          </p>
        </div>
      ))}

      {onYearToDateChange ? (
        <button
          type="button"
          onClick={() => onYearToDateChange(!yearToDate)}
          data-testid="dashboard-ytd-toggle"
          aria-pressed={yearToDate}
          aria-label="Year to date"
          className={`flex min-h-[3.25rem] min-w-[4.5rem] flex-col items-center justify-center rounded border px-2 py-1 text-center transition-colors ${
            yearToDate
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:bg-muted/40"
          }`}
        >
          <span className="text-[10px] font-semibold uppercase leading-tight tracking-wide">
            Year
          </span>
          <span className="text-[10px] font-semibold uppercase leading-tight tracking-wide">
            To
          </span>
          <span className="text-[10px] font-semibold uppercase leading-tight tracking-wide">
            Date
          </span>
        </button>
      ) : null}
    </section>
  )
}

export { SUMMARY_BOXES }
