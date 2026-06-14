import {
  formatDashboardBillCount,
  formatDashboardSummaryAmount,
} from "@/lib/shop-ui/compact-form-helpers"
import type { SalesDashboardMonthSummary } from "@/lib/shop/sales-dashboard-types"
import { themeCard, themeMuted } from "@/lib/theme/theme-classes"

const SUMMARY_BOXES = [
  { key: "last-month", label: "Last Month", field: "lastMonthSales" as const, kind: "amount" as const },
  { key: "this-month", label: "This Month", field: "grossSales" as const, kind: "amount" as const },
  { key: "net-sales", label: "Net Sales", field: "netSales" as const, kind: "amount" as const },
  { key: "refund", label: "Refund", field: "refunds" as const, kind: "amount" as const },
  { key: "gross", label: "Gross", field: "grossSales" as const, kind: "amount" as const },
  { key: "bill-count", label: "No. of Bill", field: "billCount" as const, kind: "count" as const },
] as const

type TargetSalesMonthSummaryProps = {
  summary: SalesDashboardMonthSummary
}

export function TargetSalesMonthSummary({ summary }: TargetSalesMonthSummaryProps) {
  return (
    <section
      className={`grid grid-cols-2 gap-2 rounded border border-border px-3 py-3 sm:grid-cols-3 xl:grid-cols-6 ${themeCard}`}
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
    </section>
  )
}

export { SUMMARY_BOXES }
