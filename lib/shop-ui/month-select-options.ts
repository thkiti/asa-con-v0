export const COMPACT_MONTH_ABBREVIATIONS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const

export function formatPaddedMonth(month: number): string {
  return String(month).padStart(2, "0")
}

export function formatCompactMonthOptionLabel(month: number): string {
  const abbr = COMPACT_MONTH_ABBREVIATIONS[month - 1] ?? "???"
  return `${formatPaddedMonth(month)} • ${abbr}`
}

export const COMPACT_MONTH_VALUES = Array.from({ length: 12 }, (_, index) => index + 1)
