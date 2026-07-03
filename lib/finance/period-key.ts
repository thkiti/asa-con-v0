import { FinancePostingError } from "./posting-errors"

const PERIOD_KEY_PATTERN = /^(\d{4})-(\d{2})$/

/** Validates and advances YYYY-MM to the next calendar month (2026-12 → 2027-01). */
export function advancePeriodKey(periodKey: string): string {
  const match = PERIOD_KEY_PATTERN.exec(periodKey.trim())
  if (!match) {
    throw new FinancePostingError(
      `Invalid period key ${periodKey}; expected YYYY-MM`,
      "VALIDATION_ERROR"
    )
  }

  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) {
    throw new FinancePostingError(
      `Invalid period key ${periodKey}; month must be 01–12`,
      "VALIDATION_ERROR"
    )
  }

  if (month === 12) {
    return `${year + 1}-01`
  }

  return `${year}-${String(month + 1).padStart(2, "0")}`
}
