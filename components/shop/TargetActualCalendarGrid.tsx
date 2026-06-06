"use client"

import {
  formatFinancialCellValue,
  SUNDAY_FIRST_WEEKDAY_HEADERS,
} from "@/lib/shop-ui/compact-form-helpers"
import type { TargetActualCalendarCell } from "@/lib/shop-ui/sales-dashboard-calendar"
import { themeMuted } from "@/lib/theme/theme-classes"

type TargetActualCalendarGridProps = {
  cells: TargetActualCalendarCell[]
  onActualClick: (dateKey: string) => void
  ariaLabel?: string
}

export function TargetActualCalendarGrid({
  cells,
  onActualClick,
  ariaLabel = "Target and actual sales calendar",
}: TargetActualCalendarGridProps) {
  return (
    <div
      className="grid w-full min-w-[320px] grid-cols-7 gap-px rounded-md border border-border/50 bg-border/30"
      role="grid"
      aria-label={ariaLabel}
      data-testid="target-actual-calendar-grid"
    >
      {SUNDAY_FIRST_WEEKDAY_HEADERS.map((label) => (
        <div
          key={label}
          role="columnheader"
          data-testid={`target-actual-header-${label}`}
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
              className="min-h-[4rem] bg-muted/10 sm:min-h-[4.25rem] lg:min-h-[4.5rem]"
            />
          )
        }

        const isWeekend = cell.weekdaySun0 === 0 || cell.weekdaySun0 === 6
        const actualDisplay = formatFinancialCellValue(cell.actualGross)
        const hasActual =
          actualDisplay !== "—" &&
          Number(String(cell.actualGross).replace(/,/g, "")) > 0

        return (
          <div
            key={cell.key}
            role="gridcell"
            data-testid={`target-actual-cell-${cell.dateKey}`}
            className="flex min-h-[4rem] flex-col justify-between bg-card px-1 py-1 sm:min-h-[4.25rem] sm:px-1.5 sm:py-1.5 lg:min-h-[4.5rem]"
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
            <div className="flex flex-col gap-0.5">
              <span
                className="truncate text-right text-[10px] tabular-nums leading-tight text-muted-foreground sm:text-xs"
                data-testid={`target-line-${cell.dateKey}`}
              >
                T {formatFinancialCellValue(cell.target)}
              </span>
              {hasActual ? (
                <button
                  type="button"
                  onClick={() => onActualClick(cell.dateKey)}
                  className="truncate text-right text-[10px] font-semibold tabular-nums leading-tight text-emerald-600 underline-offset-2 hover:underline sm:text-xs"
                  data-testid={`actual-line-${cell.dateKey}`}
                >
                  A {actualDisplay}
                </button>
              ) : (
                <span
                  className="truncate text-right text-[10px] tabular-nums leading-tight text-emerald-500/70 sm:text-xs"
                  data-testid={`actual-line-${cell.dateKey}`}
                >
                  A {actualDisplay}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
