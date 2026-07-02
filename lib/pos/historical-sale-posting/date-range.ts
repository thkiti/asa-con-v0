import type { HistoricalPostingDateRange } from "./types"

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const MONTH_KEY_RE = /^(\d{4})-(\d{2})$/

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

export function parseDateKey(dateKey: string): { y: number; m: number; d: number } {
  const m = DATE_KEY_RE.exec(dateKey.trim())
  if (!m) {
    throw new Error(`Invalid date key "${dateKey}" — expected YYYY-MM-DD`)
  }
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }
}

export function bangkokRangeStart(dateKey: string): Date {
  const { y, m, d } = parseDateKey(dateKey)
  return new Date(`${y}-${pad2(m)}-${pad2(d)}T00:00:00+07:00`)
}

export function monthKeyToRange(monthKey: string): HistoricalPostingDateRange {
  const m = MONTH_KEY_RE.exec(monthKey.trim())
  if (!m) {
    throw new Error(`Invalid month key "${monthKey}" — expected YYYY-MM`)
  }
  const y = Number(m[1])
  const month = Number(m[2])
  const fromDateKey = `${y}-${pad2(month)}-01`
  const nextMonth = month >= 12 ? { y: y + 1, m: 1 } : { y, m: month + 1 }
  const beforeDateKey = `${nextMonth.y}-${pad2(nextMonth.m)}-01`
  return parseHistoricalPostingDateRange(fromDateKey, beforeDateKey)
}

export function parseHistoricalPostingDateRange(
  fromDateKey: string,
  beforeDateKey: string
): HistoricalPostingDateRange {
  const from = bangkokRangeStart(fromDateKey)
  const before = bangkokRangeStart(beforeDateKey)
  if (!(from.getTime() < before.getTime())) {
    throw new Error(
      `--from (${fromDateKey}) must be strictly before --before (${beforeDateKey})`
    )
  }
  return { from, before, fromDateKey, beforeDateKey }
}

export function listPeriodKeysInRange(range: HistoricalPostingDateRange): string[] {
  const keys: string[] = []
  let y = parseDateKey(range.fromDateKey).y
  let m = parseDateKey(range.fromDateKey).m
  const endY = parseDateKey(range.beforeDateKey).y
  const endM = parseDateKey(range.beforeDateKey).m

  while (y < endY || (y === endY && m < endM)) {
    keys.push(`${y}-${pad2(m)}`)
    if (m >= 12) {
      y += 1
      m = 1
    } else {
      m += 1
    }
  }
  return keys
}
