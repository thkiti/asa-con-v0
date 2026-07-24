import {
  buildPeriodKeyFromYearMonth,
  parsePeriodKeyYearMonth,
} from "@/lib/ui/period-selector"
import {
  COMPACT_MONTH_VALUES,
  formatCompactMonthOptionLabel,
} from "@/lib/shop-ui/month-select-options"

export { buildPeriodKeyFromYearMonth, parsePeriodKeyYearMonth }

/** Default Trial Balance period = current calendar year/month (existing TB policy). */
export function defaultTrialBalancePeriodParts(now = new Date()): {
  year: number
  month: number
  periodKey: string
} {
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return { year, month, periodKey: buildPeriodKeyFromYearMonth(year, month) }
}

/** Trial Balance Year dropdown: current ± 5 (11 years inclusive). */
export const TRIAL_BALANCE_YEAR_PAST = 5
export const TRIAL_BALANCE_YEAR_FUTURE = 5

/**
 * Year options for Trial Balance period dropdown (current ± 5).
 * Prefer configuring PeriodSelector with these constants over calling this helper.
 */
export function trialBalanceYearOptions(now = new Date()): number[] {
  const current = now.getFullYear()
  return Array.from(
    { length: TRIAL_BALANCE_YEAR_PAST + TRIAL_BALANCE_YEAR_FUTURE + 1 },
    (_, index) => current - TRIAL_BALANCE_YEAR_PAST + index
  )
}

export {
  COMPACT_MONTH_VALUES as TRIAL_BALANCE_MONTH_VALUES,
  formatCompactMonthOptionLabel,
}
