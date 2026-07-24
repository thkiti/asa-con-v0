"use client"

import {
  type Dispatch,
  type KeyboardEvent,
  type ReactNode,
  type SetStateAction,
} from "react"
import { AccountingPeriodInput } from "@/components/finance/AccountingPeriodInput"
import { AccountingPeriodSelect } from "@/components/finance/AccountingPeriodSelect"
import { MoreFilterPopover } from "@/components/ui/MoreFilterPopover"
import { PeriodSelector } from "@/components/ui/PeriodSelector"
import {
  voucherInquiryFilterInput,
  voucherInquiryFilterPeriod,
  voucherInquiryFilterSelect,
  voucherInquiryMoreFilterDateInput,
} from "@/lib/finance-ui/finance-visual-classes"
import { useAccountingPeriodOptions } from "@/lib/finance-ui/use-accounting-period-options"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"
import { themeLabel } from "@/lib/theme/theme-classes"

/**
 * `accounting` — AccountingPeriodSelect (entity-scoped AccountingPeriod rows).
 * `calendar` — PeriodSelector Year/Month (YYYY-MM), for document / stock inquiry.
 * `year-month` — alias of `calendar` (legacy prop name).
 * `text` — free-text AccountingPeriodInput when empty period (= all) must remain allowed.
 */
export type DocumentInquiryPeriodMode =
  | "accounting"
  | "calendar"
  | "year-month"
  | "text"

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
   * Default `accounting` — finance AccountingPeriod dropdown.
   * Use `calendar` / `year-month` for Year+Month PeriodSelector.
   * Use `text` only when empty period must remain allowed (e.g. stock inquiry).
   */
  periodMode?: DocumentInquiryPeriodMode
  /** Optional injected periods (skips entity fetch — useful for tests). */
  periods?: AccountingPeriodRow[]
  periodsLoading?: boolean
}

type AccountingPeriodFieldProps = {
  periodKey: string
  onPeriodKeyChange: (value: string) => void
  periodTestId: string
  onPeriodKeyEnter?: () => void
  periods: AccountingPeriodRow[]
  loading: boolean
}

function AccountingPeriodFieldView({
  periodKey,
  onPeriodKeyChange,
  periodTestId,
  onPeriodKeyEnter,
  periods,
  loading,
}: AccountingPeriodFieldProps) {
  return (
    <label className={voucherInquiryFilterPeriod}>
      <span className={themeLabel}>Period</span>
      <AccountingPeriodSelect
        className={voucherInquiryFilterSelect}
        periods={periods}
        value={periodKey.trim() || null}
        onChange={onPeriodKeyChange}
        loading={loading}
        showEmptyHint={false}
        onKeyDown={(event: KeyboardEvent<HTMLSelectElement>) => {
          if (event.key === "Enter") {
            event.preventDefault()
            onPeriodKeyEnter?.()
          }
        }}
        data-testid={periodTestId}
      />
    </label>
  )
}

function AccountingPeriodInquiryFieldFetched(
  props: Omit<AccountingPeriodFieldProps, "periods" | "loading">
) {
  const { periods, loading } = useAccountingPeriodOptions()
  return <AccountingPeriodFieldView {...props} periods={periods} loading={loading} />
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
  periodMode = "accounting",
  periods,
  periodsLoading = false,
}: DocumentInquiryMoreFilterProps) {
  const hasDateFilter = Boolean(from.trim() || to.trim())
  const moreFilterActive = isMoreFilterActive ?? hasDateFilter
  const useCalendar = periodMode === "calendar" || periodMode === "year-month"
  const useText = periodMode === "text"

  const accountingFieldProps = {
    periodKey,
    onPeriodKeyChange,
    periodTestId,
    onPeriodKeyEnter,
  }

  let periodControl: ReactNode
  if (useCalendar) {
    periodControl = (
      <PeriodSelector
        periodKey={periodKey}
        onPeriodChange={onPeriodKeyChange}
        yearClassName={voucherInquiryFilterSelect}
        monthClassName={voucherInquiryFilterSelect}
        yearId={`${periodTestId}-year`}
        monthId={`${periodTestId}-month`}
        data-testid={periodTestId}
      />
    )
  } else if (useText) {
    periodControl = (
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
    )
  } else if (periods) {
    periodControl = (
      <AccountingPeriodFieldView
        {...accountingFieldProps}
        periods={periods}
        loading={periodsLoading}
      />
    )
  } else {
    periodControl = <AccountingPeriodInquiryFieldFetched {...accountingFieldProps} />
  }

  return (
    <MoreFilterPopover
      open={isMoreFilterOpen}
      onOpenChange={setIsMoreFilterOpen}
      active={moreFilterActive}
      leading={periodControl}
      testId={`${testIdPrefix}-more-filter`}
      panelTestId={`${testIdPrefix}-more-filter-panel`}
      panelAriaLabel="Date range filter"
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
    </MoreFilterPopover>
  )
}
