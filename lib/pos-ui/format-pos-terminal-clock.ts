import {
  BANGKOK_TZ,
  bangkokCalendarParts,
  bangkokTimeLabelSeconds,
} from "@/lib/reporting/bangkok-calendar"

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

/** Single-line POS terminal clock — WED 24/06/2026 14:35:08 (Asia/Bangkok). */
export function formatPosTerminalClock(d: Date): string {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: BANGKOK_TZ,
    weekday: "short",
  })
    .format(d)
    .toUpperCase()

  const { y, m, day } = bangkokCalendarParts(d)
  const datePart = `${pad2(day)}/${pad2(m)}/${y}`
  const timePart = bangkokTimeLabelSeconds(d)

  return `${weekday} ${datePart} ${timePart}`
}
