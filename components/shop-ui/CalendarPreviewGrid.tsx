import {
  formatFinancialCellValue,
  SUNDAY_FIRST_WEEKDAY_HEADERS,
} from "@/lib/shop-ui/compact-form-helpers"
import { themeMuted } from "@/lib/theme/theme-classes"

export type CalendarPreviewCell =
  | { kind: "empty"; key: string }
  | {
      kind: "day"
      key: string
      day: number
      weekdaySun0: number
      value: string | null
    }

type CalendarPreviewGridProps = {
  cells: CalendarPreviewCell[]
  headers?: readonly string[]
  ariaLabel: string
  testId?: string
  formatValue?: (value: string | null) => string
  valueClassName?: string
}

const defaultValueClass =
  "truncate text-right text-xs font-bold tabular-nums leading-tight text-emerald-500 sm:text-sm lg:text-base"

export function CalendarPreviewGrid({
  cells,
  headers = SUNDAY_FIRST_WEEKDAY_HEADERS,
  ariaLabel,
  testId = "calendar-preview-grid",
  formatValue = formatFinancialCellValue,
  valueClassName = defaultValueClass,
}: CalendarPreviewGridProps) {
  return (
    <div
      className="grid w-full min-w-[320px] grid-cols-7 gap-px rounded-md border border-border/50 bg-border/30"
      role="grid"
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {headers.map((label) => (
        <div
          key={label}
          role="columnheader"
          data-testid={`calendar-header-${label}`}
          className={`bg-card px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${themeMuted}`}
        >
          {label}
        </div>
      ))}

      {cells.map((cell) => {
        if (cell.kind === "empty") {
          return (
            <div
              key={cell.key}
              role="gridcell"
              aria-hidden
              className="min-h-[3rem] bg-muted/10 sm:min-h-[3.25rem] lg:min-h-[3.5rem]"
            />
          )
        }

        const isWeekend = cell.weekdaySun0 === 0 || cell.weekdaySun0 === 6
        return (
          <div
            key={cell.key}
            role="gridcell"
            className="flex min-h-[3rem] flex-col justify-between bg-card px-1 py-1 sm:min-h-[3.25rem] sm:px-1.5 sm:py-1.5 lg:min-h-[3.5rem]"
          >
            <span
              className={`text-[11px] tabular-nums leading-none sm:text-xs ${
                isWeekend
                  ? "font-semibold text-muted-foreground"
                  : "font-medium text-foreground/70"
              }`}
            >
              {cell.day}
            </span>
            <span className={valueClassName}>{formatValue(cell.value)}</span>
          </div>
        )
      })}
    </div>
  )
}

export { SUNDAY_FIRST_WEEKDAY_HEADERS as CALENDAR_PREVIEW_SUN_HEADERS }
