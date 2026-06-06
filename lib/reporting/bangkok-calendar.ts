/** Asia/Bangkok calendar helpers for POS sales dashboards. */

export const BANGKOK_TZ = "Asia/Bangkok"

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

export function bangkokCalendarParts(d: Date): { y: number; m: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = fmt.formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0"
  return {
    y: Number(get("year")),
    m: Number(get("month")),
    day: Number(get("day")),
  }
}

export function bangkokDateKey(d: Date): string {
  const { y, m, day } = bangkokCalendarParts(d)
  return `${y}-${pad2(m)}-${pad2(day)}`
}

export function daysInCalendarMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function bangkokMonthRange(
  year: number,
  month: number
): { start: Date; end: Date } {
  const dim = daysInCalendarMonth(year, month)
  const start = new Date(`${year}-${pad2(month)}-01T00:00:00+07:00`)
  const end = new Date(`${year}-${pad2(month)}-${pad2(dim)}T23:59:59.999+07:00`)
  return { start, end }
}

export function monthDayKeys(year: number, month: number): string[] {
  const dim = daysInCalendarMonth(year, month)
  const keys: string[] = []
  for (let d = 1; d <= dim; d++) {
    keys.push(`${year}-${pad2(month)}-${pad2(d)}`)
  }
  return keys
}

export function bangkokInstant(y: number, m: number, d: number, h = 12): Date {
  return new Date(`${y}-${pad2(m)}-${pad2(d)}T${pad2(h)}:00:00+07:00`)
}

/** Monday = 0 … Sunday = 6 (Bangkok calendar date). */
export function bangkokWeekdayMon0(y: number, month: number, day: number): number {
  const inst = bangkokInstant(y, month, day)
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: BANGKOK_TZ,
    weekday: "short",
  }).format(inst)
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  }
  return map[wd] ?? 0
}

export function previousCalendarMonth(
  year: number,
  month: number
): { year: number; month: number } {
  if (month <= 1) {
    return { year: year - 1, month: 12 }
  }
  return { year, month: month - 1 }
}

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

export function bangkokWeekdayLabel(y: number, month: number, day: number): string {
  const idx = bangkokWeekdayMon0(y, month, day)
  return WEEKDAY_SHORT[idx] ?? "Mon"
}

/** Bangkok calendar day range for a YYYY-MM-DD key. */
export function bangkokDayRange(dateKey: string): { start: Date; end: Date } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim())
  if (!m) {
    throw new Error("Invalid dateKey")
  }
  const y = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  return {
    start: new Date(`${y}-${pad2(month)}-${pad2(day)}T00:00:00+07:00`),
    end: new Date(`${y}-${pad2(month)}-${pad2(day)}T23:59:59.999+07:00`),
  }
}

/** HH:mm in Asia/Bangkok. */
export function bangkokTimeLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
}

/** HH:mm:ss in Asia/Bangkok. */
export function bangkokTimeLabelSeconds(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d)
}
