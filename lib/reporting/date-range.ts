import { InvalidDateRangeError } from "./report-errors"

export type NormalizedDateRange = {
  start: Date
  endExclusive: Date
}

function toDate(value: Date | string): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new InvalidDateRangeError("Invalid date value")
  }
  return date
}

/** Normalize an inclusive calendar-day range to [start, endExclusive). */
export function normalizeDayRange(day: Date | string): NormalizedDateRange {
  const base = toDate(day)
  const start = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate())
  )
  const endExclusive = new Date(start)
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)
  return { start, endExclusive }
}

/** Normalize arbitrary from/to into [start, endExclusive) using UTC day boundaries. */
export function normalizeDateRange(input: {
  from: Date | string
  to: Date | string
}): NormalizedDateRange {
  const fromDay = normalizeDayRange(input.from)
  const toDay = normalizeDayRange(input.to)

  if (fromDay.start.getTime() > toDay.start.getTime()) {
    throw new InvalidDateRangeError("from must be on or before to")
  }

  return {
    start: fromDay.start,
    endExclusive: toDay.endExclusive,
  }
}
