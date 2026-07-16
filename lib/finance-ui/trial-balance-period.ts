import {
  COMPACT_MONTH_VALUES,
  formatCompactMonthOptionLabel,
  formatPaddedMonth,
} from "@/lib/shop-ui/month-select-options"

/** Build canonical finance periodKey YYYY-MM from year + month (1–12). */
export function buildPeriodKeyFromYearMonth(year: number, month: number): string {
  return `${year}-${formatPaddedMonth(month)}`
}

/** Parse YYYY-MM into year/month parts; null if invalid. */
export function parsePeriodKeyYearMonth(
  periodKey: string
): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(periodKey.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null
  }
  return { year, month }
}

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

/** Year options for Trial Balance period dropdown (current ± 5). */
export function trialBalanceYearOptions(now = new Date()): number[] {
  const current = now.getFullYear()
  return Array.from({ length: 11 }, (_, index) => current - 5 + index)
}

export {
  COMPACT_MONTH_VALUES as TRIAL_BALANCE_MONTH_VALUES,
  formatCompactMonthOptionLabel,
}
