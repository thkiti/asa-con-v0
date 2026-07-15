"use client"

import {
  formatFinancialCellValue,
  SUNDAY_FIRST_WEEKDAY_HEADERS,
} from "@/lib/shop-ui/compact-form-helpers"
import type { TargetActualCalendarCell } from "@/lib/shop-ui/sales-dashboard-calendar"
import { themeMuted } from "@/lib/theme/theme-classes"

type TargetActualCalendarGridProps = {
  cells: TargetActualCalendarCell[]
  weekdayPatterns?: ReadonlyArray<string | null>
  onActualClick: (dateKey: string) => void
  ariaLabel?: string
}

function WeekdayHeader({
  label,
  pattern,
}: {
  label: (typeof SUNDAY_FIRST_WEEKDAY_HEADERS)[number]
  pattern: string | null | undefined
}) {
  const patternDisplay = pattern ?? "-"

  return (
    <div
      role="columnheader"
      data-testid={`target-actual-header-${label}`}
      className={`border-b border-zinc-600/40 bg-card px-0.5 py-1.5 text-center sm:px-1 ${themeMuted}`}
    >
      <div className="flex flex-col items-center leading-tight">
        <span className="text-[10px] font-semibold uppercase tracking-wide sm:text-xs">
          {label}
        </span>
        <span
          className="text-[9px] font-normal tabular-nums tracking-normal text-muted-foreground/75 sm:text-[10px]"
          data-testid={`target-actual-header-pattern-${label}`}
        >
          ({patternDisplay})
        </span>
      </div>
    </div>
  )
}

function formatCalendarAmount(value: string | null | undefined): string {
  const formatted = formatFinancialCellValue(value)
  return formatted === "—" ? "-" : formatted
}

function CalendarAmountRow({
  label,
  amount,
  bold = false,
  testId,
  onClick,
}: {
  label: "L" | "A" | "V"
  amount: string
  bold?: boolean
  testId: string
  onClick?: () => void
}) {
  const amountClass = `shrink-0 text-right text-xs tabular-nums leading-tight sm:text-sm ${
    bold
      ? "font-semibold text-emerald-600"
      : label === "A"
        ? "font-normal text-emerald-500/70"
        : label === "V"
          ? "font-normal text-muted-foreground/80"
          : "font-normal text-muted-foreground"
  }`

  return (
    <div
      className="flex w-full items-baseline justify-between gap-2"
      data-testid={testId}
    >
      <span className="w-3 shrink-0 text-[9px] font-medium leading-none text-muted-foreground sm:text-[10px]">
        {label}
      </span>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={`${amountClass} underline-offset-2 hover:underline`}
        >
          {amount}
        </button>
      ) : (
        <span className={amountClass}>{amount}</span>
      )}
    </div>
  )
}

export function TargetActualCalendarGrid({
  cells,
  weekdayPatterns,
  onActualClick,
  ariaLabel = "Last month and actual sales calendar",
}: TargetActualCalendarGridProps) {
  return (
    <div
      className="grid w-full grid-cols-7 gap-px rounded-md border border-zinc-600/45 bg-zinc-600/30"
      role="grid"
      aria-label={ariaLabel}
      data-testid="target-actual-calendar-grid"
    >
      {SUNDAY_FIRST_WEEKDAY_HEADERS.map((label, index) => (
        <WeekdayHeader
          key={label}
          label={label}
          pattern={weekdayPatterns?.[index]}
        />
      ))}

      {cells.map((cell) => {
        if (cell.kind === "empty") {
          return (
            <div
              key={cell.key}
              role="gridcell"
              aria-hidden
              className="min-h-[4.25rem] bg-muted/10 sm:min-h-[4.5rem] lg:min-h-[4.75rem]"
            />
          )
        }

        const isWeekend = cell.weekdaySun0 === 0 || cell.weekdaySun0 === 6
        const lastMonthDisplay = formatCalendarAmount(cell.lastMonthGross)
        const actualDisplay = formatCalendarAmount(cell.actualGross)
        const vatDisplay = formatCalendarAmount(cell.actualVat)
        const hasActual =
          actualDisplay !== "-" &&
          Number(String(cell.actualGross).replace(/,/g, "")) > 0

        return (
          <div
            key={cell.key}
            role="gridcell"
            data-testid={`target-actual-cell-${cell.dateKey}`}
            className="flex min-h-[4.75rem] flex-col justify-between border border-zinc-600/20 bg-card px-1 py-1 sm:min-h-[5rem] sm:px-1.5 sm:py-1.5 lg:min-h-[5.25rem]"
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
              <CalendarAmountRow
                label="L"
                amount={lastMonthDisplay}
                testId={`last-month-line-${cell.dateKey}`}
              />
              <CalendarAmountRow
                label="A"
                amount={actualDisplay}
                bold={hasActual}
                testId={`actual-line-${cell.dateKey}`}
                onClick={hasActual ? () => onActualClick(cell.dateKey) : undefined}
              />
              <CalendarAmountRow
                label="V"
                amount={vatDisplay}
                testId={`vat-line-${cell.dateKey}`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
