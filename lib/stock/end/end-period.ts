import { bangkokMonthRange } from "@/lib/reporting/bangkok-calendar"
import { EndError, EndErrorCodes } from "./end-errors"

export const INITIAL_END_PERIOD = "2026-01"

const PERIOD_RE = /^(\d{4})-(\d{2})$/

export function parsePeriodMonth(input: string): { year: number; month: number } {
  const trimmed = String(input ?? "").trim()
  const m = PERIOD_RE.exec(trimmed)
  if (!m) {
    throw new EndError(
      "periodMonth must be YYYY-MM",
      EndErrorCodes.INVALID_PERIOD
    )
  }
  const year = Number(m[1])
  const month = Number(m[2])
  if (!Number.isFinite(year) || month < 1 || month > 12) {
    throw new EndError(
      "periodMonth must be a valid YYYY-MM",
      EndErrorCodes.INVALID_PERIOD
    )
  }
  return { year, month }
}

export function periodBounds(periodMonth: string): { start: Date; end: Date } {
  const { year, month } = parsePeriodMonth(periodMonth)
  return bangkokMonthRange(year, month)
}

export function previousPeriodMonth(periodMonth: string): string {
  const { year, month } = parsePeriodMonth(periodMonth)
  if (month <= 1) {
    return `${year - 1}-12`
  }
  return `${year}-${String(month - 1).padStart(2, "0")}`
}

export function endPeriodKey(
  legalEntityCode: string,
  branchId: string,
  periodMonth: string
): string {
  const entity = String(legalEntityCode ?? "").trim().toUpperCase()
  const branch = String(branchId ?? "").trim()
  const period = String(periodMonth ?? "").trim()
  parsePeriodMonth(period)
  if (!entity) {
    throw new EndError("legalEntityCode is required", EndErrorCodes.INVALID_INPUT)
  }
  if (!branch) {
    throw new EndError("branchId is required", EndErrorCodes.INVALID_INPUT)
  }
  return `${entity}:${branch}:${period}`
}

export function isInitialEndPeriod(periodMonth: string): boolean {
  return String(periodMonth ?? "").trim() === INITIAL_END_PERIOD
}
