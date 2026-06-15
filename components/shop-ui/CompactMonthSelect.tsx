import { compactHeaderFieldClass } from "@/lib/shop-ui/compact-form-helpers"
import {
  COMPACT_MONTH_VALUES,
  formatCompactMonthOptionLabel,
  formatPaddedMonth,
} from "@/lib/shop-ui/month-select-options"

type CompactMonthSelectProps = {
  value: number
  onChange: (month: number) => void
  disabled?: boolean
  "aria-label"?: string
  "data-testid"?: string
  className?: string
}

export function CompactMonthSelect({
  value,
  onChange,
  disabled = false,
  "aria-label": ariaLabel = "Month",
  "data-testid": testId = "dashboard-month",
  className = "",
}: CompactMonthSelectProps) {
  return (
    <div className={`relative ${className}`.trim()} data-testid={`${testId}-shell`}>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        aria-label={ariaLabel}
        data-testid={testId}
        className={`${compactHeaderFieldClass} w-full px-1 text-center tabular-nums text-transparent`}
      >
        {COMPACT_MONTH_VALUES.map((month) => (
          <option
            key={month}
            value={month}
            className="text-foreground"
            data-testid={`${testId}-option-${formatPaddedMonth(month)}`}
          >
            {formatCompactMonthOptionLabel(month)}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm tabular-nums leading-none text-foreground"
        aria-hidden
        data-testid={`${testId}-display`}
      >
        {formatPaddedMonth(value)}
      </span>
    </div>
  )
}
