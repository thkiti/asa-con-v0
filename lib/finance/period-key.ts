import { FinancePostingError } from "./posting-errors"

const PERIOD_KEY_PATTERN = /^(\d{4})-(\d{2})$/

function formatValidatedYearMonth(year: string, monthRaw: string): string | null {
  const month = Number(monthRaw)
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    return null
  }
  return `${year}-${String(month).padStart(2, "0")}`
}

/**
 * Parse flexible accounting period input into canonical YYYY-MM.
 * Accepts: 202601, 2026-01, 2026/01, 2026 01 (and 2026-1 → 2026-01).
 */
export function normalizeAccountingPeriodKey(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  const compact = /^(\d{4})(\d{2})$/.exec(trimmed)
  if (compact) {
    return formatValidatedYearMonth(compact[1], compact[2])
  }

  const separated = /^(\d{4})[-/\s]+(\d{1,2})$/.exec(trimmed)
  if (separated) {
    return formatValidatedYearMonth(separated[1], separated[2])
  }

  if (PERIOD_KEY_PATTERN.test(trimmed)) {
    const [, year, month] = trimmed.split("-")
    return formatValidatedYearMonth(year, month)
  }

  return null
}

/** True when compact YYYYMM (six digits only) should normalize immediately. */
export function shouldNormalizeAccountingPeriodKeyImmediately(value: string): boolean {
  return /^\d{6}$/.test(value.trim())
}

/** Resolve filter/API period key — returns canonical YYYY-MM or undefined. */
export function resolveAccountingPeriodKeyFilter(
  value: string | undefined | null
): string | undefined {
  if (!value?.trim()) {
    return undefined
  }
  return normalizeAccountingPeriodKey(value) ?? undefined
}

/** Validates and advances YYYY-MM to the next calendar month (2026-12 → 2027-01). */
export function advancePeriodKey(periodKey: string): string {
  const normalized = normalizeAccountingPeriodKey(periodKey)
  if (!normalized) {
    throw new FinancePostingError(
      `Invalid period key ${periodKey}; expected YYYY-MM`,
      "VALIDATION_ERROR"
    )
  }

  const match = PERIOD_KEY_PATTERN.exec(normalized)
  if (!match) {
    throw new FinancePostingError(
      `Invalid period key ${periodKey}; expected YYYY-MM`,
      "VALIDATION_ERROR"
    )
  }

  const year = Number(match[1])
  const month = Number(match[2])

  if (month === 12) {
    return `${year + 1}-01`
  }

  return `${year}-${String(month + 1).padStart(2, "0")}`
}

export function isValidPeriodKey(periodKey: string): boolean {
  return normalizeAccountingPeriodKey(periodKey) !== null
}

export function periodKeyToDateRange(periodKey: string): {
  from: string
  to: string
} | null {
  const normalized = normalizeAccountingPeriodKey(periodKey)
  if (!normalized) {
    return null
  }

  const [yearStr, monthStr] = normalized.split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)
  const lastDay = new Date(year, month, 0).getDate()
  return {
    from: `${yearStr}-${monthStr}-01`,
    to: `${yearStr}-${monthStr}-${String(lastDay).padStart(2, "0")}`,
  }
}
