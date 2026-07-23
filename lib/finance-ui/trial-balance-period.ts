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

/**
 * Year options for Trial Balance period dropdown (current ± 5).
 * Note: ASA-CON PeriodSelector standard uses current−2…+7 (10 years).
 * Trial Balance still uses this wider window until migrated.
 */
export function trialBalanceYearOptions(now = new Date()): number[] {
  const current = now.getFullYear()
  return Array.from({ length: 11 }, (_, index) => current - 5 + index)
}

export {
  COMPACT_MONTH_VALUES as TRIAL_BALANCE_MONTH_VALUES,
  formatCompactMonthOptionLabel,
}
