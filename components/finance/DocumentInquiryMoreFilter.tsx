"use client"

import { useEffect, useId, useRef, type Dispatch, type SetStateAction } from "react"
import { AccountingPeriodInput } from "@/components/finance/AccountingPeriodInput"
import {
  voucherInquiryFilterInput,
  voucherInquiryFilterMore,
  voucherInquiryFilterPeriod,
  voucherInquiryFilterPeriodGroup,
  voucherInquiryMoreFilterButton,
  voucherInquiryMoreFilterButtonActive,
  voucherInquiryMoreFilterButtonDot,
  voucherInquiryMoreFilterDateInput,
  voucherInquiryMoreFilterPopover,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeLabel } from "@/lib/theme/theme-classes"

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
}: DocumentInquiryMoreFilterProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const popoverId = useId()
  const hasDateFilter = Boolean(from.trim() || to.trim())
  const moreFilterActive = isMoreFilterActive ?? hasDateFilter

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

  return (
    <div ref={rootRef} className={voucherInquiryFilterPeriodGroup}>
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
