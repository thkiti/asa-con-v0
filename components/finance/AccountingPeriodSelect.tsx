"use client"

import { useEffect, useMemo, useRef, useState, type SelectHTMLAttributes } from "react"
import {
  formatAccountingPeriodOptionLabel,
  formatAccountingPeriodSelectedTooltip,
  FINANCE_PERIOD_FILTER_EMPTY_MESSAGE,
} from "@/lib/finance-ui/accounting-period-filter"
import { voucherInquiryFilterSelect } from "@/lib/finance-ui/finance-visual-classes"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"
import { themeTextSecondary } from "@/lib/theme/theme-classes"

type SelectedLabelMode = "full" | "periodKey"

type AccountingPeriodSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange" | "children"
> & {
  periods: AccountingPeriodRow[]
  value: string | null
  onChange: (periodKey: string) => void
  loading?: boolean
  emptyMessage?: string
  showEmptyHint?: boolean
  /** Closed control shows periodKey only; dropdown options keep status labels. */
  selectedLabelMode?: SelectedLabelMode
  "data-testid"?: string
}

function findSelectedPeriod(
  periods: AccountingPeriodRow[],
  value: string | null
): AccountingPeriodRow | null {
  if (!value) return null
  return periods.find((period) => period.periodKey === value) ?? null
}

type AccountingPeriodCompactSelectProps = {
  periods: AccountingPeriodRow[]
  value: string | null
  onChange: (periodKey: string) => void
  loading: boolean
  emptyMessage: string
  showEmptyHint: boolean
  isEmpty: boolean
  selectDisabled: boolean
  className?: string
  id?: string
  "data-testid"?: string
}

function AccountingPeriodCompactSelect({
  periods,
  value,
  onChange,
  loading,
  emptyMessage,
  showEmptyHint,
  isEmpty,
  selectDisabled,
  className,
  id,
  "data-testid": testId,
}: AccountingPeriodCompactSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedPeriod = useMemo(() => findSelectedPeriod(periods, value), [periods, value])
  const selectedTooltip = selectedPeriod
    ? formatAccountingPeriodSelectedTooltip(selectedPeriod)
    : undefined

  const displayLabel = loading
    ? "Loading periods…"
    : isEmpty
      ? "No periods"
      : value || "Select period"

  useEffect(() => {
    if (!open) return

    const onDocumentMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", onDocumentMouseDown)
    document.addEventListener("keydown", onDocumentKeyDown)
    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown)
      document.removeEventListener("keydown", onDocumentKeyDown)
    }
  }, [open])

  const controlClassName = className ?? voucherInquiryFilterSelect

  return (
    <div className="space-y-1" ref={rootRef}>
      <div className="relative w-full">
        <button
          type="button"
          id={id}
          title={selectedTooltip}
          className={`${controlClassName} flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 text-left`}
          disabled={selectDisabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => {
            if (!selectDisabled) {
              setOpen((current) => !current)
            }
          }}
          data-testid={testId}
        >
          <span className="truncate">{displayLabel}</span>
          <span aria-hidden className="shrink-0 text-xs opacity-60">
            ▾
          </span>
        </button>
        {open && !selectDisabled ? (
          <ul
            role="listbox"
            aria-labelledby={id}
            className="absolute left-0 top-full z-50 mt-1 max-h-60 min-w-full w-max overflow-y-auto rounded border border-zinc-200 bg-white py-1 font-mono text-sm shadow-md dark:border-border dark:bg-card"
          >
            {periods.map((period) => (
              <li
                key={period.id}
                role="option"
                aria-selected={period.periodKey === value}
                className="cursor-pointer whitespace-nowrap px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-muted"
                onClick={() => {
                  onChange(period.periodKey)
                  setOpen(false)
                }}
              >
                {formatAccountingPeriodOptionLabel(period)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {showEmptyHint && isEmpty ? (
        <p className={`text-xs ${themeTextSecondary}`} data-testid="finance-period-filter-empty">
          {emptyMessage}
        </p>
      ) : null}
    </div>
  )
}

export function AccountingPeriodSelect({
  periods,
  value,
  onChange,
  loading = false,
  emptyMessage = FINANCE_PERIOD_FILTER_EMPTY_MESSAGE,
  showEmptyHint = true,
  selectedLabelMode = "full",
  disabled,
  className,
  "data-testid": dataTestId,
  ...rest
}: AccountingPeriodSelectProps) {
  const isEmpty = !loading && periods.length === 0
  const selectDisabled = disabled || loading || isEmpty
  const selectedPeriod = useMemo(() => findSelectedPeriod(periods, value), [periods, value])
  const selectedTooltip = selectedPeriod
    ? formatAccountingPeriodSelectedTooltip(selectedPeriod)
    : undefined

  if (selectedLabelMode === "periodKey") {
    return (
      <AccountingPeriodCompactSelect
        periods={periods}
        value={value}
        onChange={onChange}
        loading={loading}
        emptyMessage={emptyMessage}
        showEmptyHint={showEmptyHint}
        isEmpty={isEmpty}
        selectDisabled={selectDisabled}
        className={className}
        id={rest.id}
        data-testid={dataTestId}
      />
    )
  }

  return (
    <div className="space-y-1">
      <select
        {...rest}
        className={className ?? voucherInquiryFilterSelect}
        value={value ?? ""}
        disabled={selectDisabled}
        title={selectedTooltip}
        onChange={(event) => onChange(event.target.value)}
        data-testid={dataTestId}
      >
        <option value="">
          {loading
            ? "Loading periods…"
            : isEmpty
              ? "No periods"
              : "Select period"}
        </option>
        {periods.map((period) => (
          <option key={period.id} value={period.periodKey}>
            {formatAccountingPeriodOptionLabel(period)}
          </option>
        ))}
      </select>
      {showEmptyHint && isEmpty ? (
        <p className={`text-xs ${themeTextSecondary}`} data-testid="finance-period-filter-empty">
          {emptyMessage}
        </p>
      ) : null}
    </div>
  )
}
