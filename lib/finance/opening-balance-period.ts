/**
 * Bootstrap opening balance period — one-time pre-live month (not a normal close cycle).
 * Matches ASAD opening balance repair / UAT cleanup convention (`2025-12`).
 */
export const OPENING_BALANCE_PERIOD_KEY = "2025-12"

export function isOpeningBalancePeriodKey(periodKey: string): boolean {
  return periodKey.trim() === OPENING_BALANCE_PERIOD_KEY
}

export function isOpeningBalancePeriod(input: {
  periodKey: string
}): boolean {
  return isOpeningBalancePeriodKey(input.periodKey)
}
