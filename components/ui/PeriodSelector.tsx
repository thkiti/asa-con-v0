"use client"

import { useMemo } from "react"
import {
  buildPeriodKeyFromYearMonth,
  formatCompactMonthOptionLabel,
  PERIOD_SELECTOR_MONTH_VALUES,
  periodSelectorYearOptions,
  resolvePeriodSelectorParts,
} from "@/lib/ui/period-selector"
import { masterToolbarInput, masterToolbarLabel } from "@/lib/master-ui/table-classes"

export type PeriodSelectorProps = {
  /** Controlled periodKey in YYYY-MM format. */
  periodKey: string
  /** Emits a complete valid YYYY-MM whenever Year or Month changes. */
  onPeriodChange: (nextPeriodKey: string) => void
  disabled?: boolean
  className?: string
  yearClassName?: string
  monthClassName?: string
  yearId?: string
  monthId?: string
  "data-testid"?: string
}

/**
 * ASA-CON standard period control: separate Year and Month dropdowns.
 * Year = current−2 … current+7 (10 years). Month = shared 01 • JAN … 12 • DEC.
 * Output: periodKey YYYY-MM.
 */
export function PeriodSelector({
  periodKey,
  onPeriodChange,
  disabled = false,
  className = "",
  yearClassName,
  monthClassName,
  yearId = "period-selector-year",
  monthId = "period-selector-month",
  "data-testid": testId = "period-selector",
}: PeriodSelectorProps) {
  const parts = useMemo(() => resolvePeriodSelectorParts(periodKey), [periodKey])
  const yearOptions = useMemo(() => periodSelectorYearOptions(), [])

  const emit = (year: number, month: number) => {
    onPeriodChange(buildPeriodKeyFromYearMonth(year, month))
  }

  return (
    <div
      className={`flex min-w-0 items-end gap-2 ${className}`.trim()}
      data-testid={testId}
      role="group"
      aria-label="Period"
    >
      <label className="flex w-[4.75rem] shrink-0 flex-col">
        <span className={masterToolbarLabel}>Year</span>
        <select
          id={yearId}
          value={parts.year}
          disabled={disabled}
          onChange={(event) => emit(Number(event.target.value), parts.month)}
          className={yearClassName ?? `${masterToolbarInput} tabular-nums`}
          aria-label="Year"
          data-testid={`${testId}-year`}
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-0 flex-1 flex-col">
        <span className={masterToolbarLabel}>Month</span>
        <select
          id={monthId}
          value={parts.month}
          disabled={disabled}
          onChange={(event) => emit(parts.year, Number(event.target.value))}
          className={monthClassName ?? masterToolbarInput}
          aria-label="Month"
          data-testid={`${testId}-month`}
        >
          {PERIOD_SELECTOR_MONTH_VALUES.map((month) => (
            <option key={month} value={month}>
              {formatCompactMonthOptionLabel(month)}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
