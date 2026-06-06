import type { DailyTargetSplit } from "@/lib/shop/sales-target-types"
import { CalendarPreviewGrid } from "@/components/shop-ui/CalendarPreviewGrid"
import {
  buildSalesTargetCalendarGrid,
  formatWeekPatternSummary,
} from "@/lib/shop-ui/sales-target-calendar"
import { themeMuted } from "@/lib/theme/theme-classes"

type SalesTargetCalendarPreviewProps = {
  year: number
  month: number
  days: DailyTargetSplit[]
  weekPattern: number[]
  loading?: boolean
  embedded?: boolean
}

export function SalesTargetCalendarPreview({
  year,
  month,
  days,
  weekPattern,
  loading = false,
  embedded = false,
}: SalesTargetCalendarPreviewProps) {
  const gridCells = buildSalesTargetCalendarGrid({ year, month, days }).map(
    (cell, i) =>
      cell.kind === "empty"
        ? { kind: "empty" as const, key: `pad-${i}` }
        : {
            kind: "day" as const,
            key: cell.dateKey,
            day: cell.day,
            weekdaySun0: cell.weekdaySun0,
            value: cell.target,
          }
  )

  return (
    <section
      className={
        embedded
          ? "border-t border-border/50 pt-2"
          : "mt-6 rounded-lg border border-border bg-card p-6 text-card-foreground p-4"
      }
      aria-label="Daily target preview"
      data-testid="sales-target-calendar-preview"
    >
      <h2 className="text-xs font-semibold leading-none">
        Daily target preview
        {loading ? (
          <span className={`ml-2 font-normal ${themeMuted}`}>Calculating…</span>
        ) : null}
      </h2>

      <div className="mt-1.5 w-full overflow-x-auto">
        <CalendarPreviewGrid
          cells={gridCells}
          ariaLabel={`${year}-${String(month).padStart(2, "0")} daily targets`}
          testId="sales-target-calendar-grid"
        />
      </div>

      <p
        className={`mt-1.5 text-[10px] leading-snug sm:text-[11px] ${themeMuted}`}
        data-testid="sales-target-calendar-footer"
      >
        {formatWeekPatternSummary(weekPattern)}
      </p>
    </section>
  )
}
