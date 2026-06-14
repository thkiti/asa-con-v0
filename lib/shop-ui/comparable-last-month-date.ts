import {
  daysInCalendarMonth,
  previousCalendarMonth,
} from "@/lib/reporting/bangkok-calendar"
import { bangkokWeekdaySun0 } from "@/lib/shop-ui/sales-target-calendar"

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

export type CalendarGridPosition = {
  weekRowIndex: number
  weekdayColIndex: number
}

/** Sunday-first calendar grid position for a Bangkok calendar day. */
export function getCalendarGridPosition(
  year: number,
  month: number,
  day: number
): CalendarGridPosition {
  const leadingPads = bangkokWeekdaySun0(year, month, 1)
  const gridIndex = leadingPads + (day - 1)
  return {
    weekRowIndex: Math.floor(gridIndex / 7),
    weekdayColIndex: gridIndex % 7,
  }
}

/**
 * Resolve a Bangkok calendar day at the same Sun-first grid cell, or null when
 * that cell is padding / outside the month.
 */
export function getDateAtCalendarGridPosition(
  year: number,
  month: number,
  position: CalendarGridPosition
): { year: number; month: number; day: number } | null {
  const leadingPads = bangkokWeekdaySun0(year, month, 1)
  const dim = daysInCalendarMonth(year, month)
  const gridIndex = position.weekRowIndex * 7 + position.weekdayColIndex
  const day = gridIndex - leadingPads + 1
  if (day < 1 || day > dim) return null
  return { year, month, day }
}

export function toBangkokDateKey(input: {
  year: number
  month: number
  day: number
}): string {
  return `${input.year}-${pad2(input.month)}-${pad2(input.day)}`
}

/** Previous-month comparable date for the same calendar grid cell, or null. */
export function getComparableLastMonthDate(input: {
  year: number
  month: number
  day: number
}): string | null {
  const position = getCalendarGridPosition(input.year, input.month, input.day)
  const previous = previousCalendarMonth(input.year, input.month)
  const comparable = getDateAtCalendarGridPosition(
    previous.year,
    previous.month,
    position
  )
  if (!comparable) return null
  return toBangkokDateKey(comparable)
}

export function getComparableLastMonthDateFromDateKey(dateKey: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey).trim())
  if (!match) return null
  return getComparableLastMonthDate({
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  })
}
