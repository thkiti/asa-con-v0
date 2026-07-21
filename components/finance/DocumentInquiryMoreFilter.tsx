"use client"

import {
  useEffect,
  useId,
  useRef,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
} from "react"
import { AccountingPeriodInput } from "@/components/finance/AccountingPeriodInput"
import {
  voucherInquiryFilterInput,
  voucherInquiryFilterMore,
  voucherInquiryFilterPeriod,
  voucherInquiryFilterPeriodGroup,
  voucherInquiryFilterPeriodMonth,
  voucherInquiryFilterPeriodYear,
  voucherInquiryFilterSelect,
  voucherInquiryMoreFilterButton,
  voucherInquiryMoreFilterButtonActive,
  voucherInquiryMoreFilterButtonDot,
  voucherInquiryMoreFilterDateInput,
  voucherInquiryMoreFilterPopover,
} from "@/lib/finance-ui/finance-visual-classes"
import {
  buildPeriodKeyFromYearMonth,
  defaultTrialBalancePeriodParts,
  parsePeriodKeyYearMonth,
} from "@/lib/finance-ui/trial-balance-period"
import { formatPaddedMonth } from "@/lib/shop-ui/month-select-options"
import { themeLabel } from "@/lib/theme/theme-classes"

const PERIOD_MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1)

export type DocumentInquiryPeriodMode = "text" | "year-month"

type DocumentInquiryMoreFilterProps = {
  periodKey: string
  onPeriodKeyChange: (value: string) => void
  periodTestId: string
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  testIdPrefix: string
  isMoreFilterOpen: boolean
  setIsMoreFilterOpen: Dispatch<SetStateAction<boolean>>
  onPeriodKeyEnter?: () => void
  /** When set, overrides default active state (any from/to set). */
  isMoreFilterActive?: boolean
  /**
   * `text` — free-text period (legacy inquiry lists).
   * `year-month` — required Year numeric + Month 01–12 (Finance Document Inquiry).
   */
  periodMode?: DocumentInquiryPeriodMode
}

function resolveYearMonthParts(periodKey: string): { year: number; month: number } {
  return parsePeriodKeyYearMonth(periodKey) ?? defaultTrialBalancePeriodParts()
}

export function DocumentInquiryMoreFilter({
  periodKey,
  onPeriodKeyChange,
  periodTestId,
  from,
  to,
  onFromChange,
  onToChange,
  testIdPrefix,
  isMoreFilterOpen,
  setIsMoreFilterOpen,
  onPeriodKeyEnter,
  isMoreFilterActive,
  periodMode = "text",
}: DocumentInquiryMoreFilterProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const popoverId = useId()
  const hasDateFilter = Boolean(from.trim() || to.trim())
  const moreFilterActive = isMoreFilterActive ?? hasDateFilter
  const yearMonth = resolveYearMonthParts(periodKey)

  useEffect(() => {
    if (!isMoreFilterOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (rootRef.current?.contains(target as Node)) return
      setIsMoreFilterOpen(false)
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [isMoreFilterOpen, setIsMoreFilterOpen])

  const handleToggle = () => {
    setIsMoreFilterOpen((open) => !open)
  }

  const emitYearMonth = (year: number, month: number) => {
    onPeriodKeyChange(buildPeriodKeyFromYearMonth(year, month))
  }

  const handlePeriodKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault()
      onPeriodKeyEnter?.()
    }
  }

  return (
    <div ref={rootRef} className={voucherInquiryFilterPeriodGroup}>
      {periodMode === "year-month" ? (
        <>
          <label className={voucherInquiryFilterPeriodYear}>
            <span className={themeLabel}>Year</span>
            <input
              type="number"
              inputMode="numeric"
              min={2000}
              max={2100}
              step={1}
              required
              className={voucherInquiryFilterInput}
              value={yearMonth.year}
              onChange={(event) => {
                const nextYear = Number(event.target.value)
                if (!Number.isFinite(nextYear)) return
                emitYearMonth(nextYear, yearMonth.month)
              }}
              onKeyDown={handlePeriodKeyDown}
              aria-label="Period year"
              data-testid={`${periodTestId}-year`}
            />
          </label>
          <label className={voucherInquiryFilterPeriodMonth}>
            <span className={themeLabel}>Month</span>
            <select
              required
              className={voucherInquiryFilterSelect}
              value={yearMonth.month}
              onChange={(event) => {
                emitYearMonth(yearMonth.year, Number(event.target.value))
              }}
              onKeyDown={handlePeriodKeyDown}
              aria-label="Period month"
              data-testid={`${periodTestId}-month`}
            >
              {PERIOD_MONTH_OPTIONS.map((month) => (
                <option key={month} value={month}>
                  {formatPaddedMonth(month)}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <label className={voucherInquiryFilterPeriod}>
          <span className={themeLabel}>Period</span>
          <AccountingPeriodInput
            className={voucherInquiryFilterInput}
            value={periodKey}
            onChange={onPeriodKeyChange}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                onPeriodKeyEnter?.()
              }
            }}
            data-testid={periodTestId}
          />
        </label>
      )}
      <div className={voucherInquiryFilterMore}>
        <span className={`${themeLabel} invisible select-none`} aria-hidden="true">
          &nbsp;
        </span>
        <button
          type="button"
          className={`${voucherInquiryMoreFilterButton}${
            moreFilterActive ? ` ${voucherInquiryMoreFilterButtonActive}` : ""
          }`}
          title="More filter"
          aria-label="More filter"
          aria-expanded={isMoreFilterOpen}
          aria-controls={isMoreFilterOpen ? popoverId : undefined}
          data-active={moreFilterActive ? "true" : "false"}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={handleToggle}
          data-testid={`${testIdPrefix}-more-filter`}
        >
          <span className={voucherInquiryMoreFilterButtonDot} aria-hidden="true" />
        </button>
      </div>
      {isMoreFilterOpen ? (
        <div
          id={popoverId}
          className={voucherInquiryMoreFilterPopover}
          data-testid={`${testIdPrefix}-more-filter-panel`}
          role="group"
          aria-label="Date range filter"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <input
            type="date"
            className={voucherInquiryMoreFilterDateInput}
            value={from}
            onChange={(event) => onFromChange(event.target.value)}
            aria-label="From date"
            data-testid={`${testIdPrefix}-filter-from`}
          />
          <input
            type="date"
            className={voucherInquiryMoreFilterDateInput}
            value={to}
            onChange={(event) => onToChange(event.target.value)}
            aria-label="To date"
            data-testid={`${testIdPrefix}-filter-to`}
          />
        </div>
      ) : null}
    </div>
  )
}
