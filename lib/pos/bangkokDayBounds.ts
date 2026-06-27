/** วันที่ปฏิทิน Asia/Bangkok เป็น YYYY-MM-DD */
export function bangkokCalendarYmd(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

/**
 * ช่วง UTC สำหรับวันปฏิทิน Bangkok หนึ่งวัน (ไทยไม่มี DST — เที่ยงคืน BKK = 17:00 UTC วันก่อน)
 */
export function utcRangeForBangkokCalendarDay(ymd: string): {
  start: Date
  endExclusive: Date
} {
  const [y, mo, da] = ymd.split("-").map(Number)
  if (!y || !mo || !da) throw new Error(`Invalid Bangkok YMD: ${ymd}`)
  const start = new Date(Date.UTC(y, mo - 1, da - 1, 17, 0, 0, 0))
  const endExclusive = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, endExclusive }
}

/** YYYY-MM จาก instant ในปฏิทินกรุงเทพ */
export function bangkokCalendarYm(d: Date): string {
  return bangkokCalendarYmd(d).slice(0, 7)
}

/** จำนวนวันปฏิทินกรุงเทพรวมทั้งสิ้น (รวมปลายทาง) */
export function countInclusiveBangkokCalendarDays(
  fromYmd: string,
  toYmd: string
): number {
  const { start } = utcRangeForBangkokCalendarDay(fromYmd)
  const { endExclusive } = utcRangeForBangkokCalendarDay(toYmd)
  const ms = endExclusive.getTime() - start.getTime()
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)))
}

/** UTC [start, endExclusive) ครอบคลุม fromYmd ถึง toYmd (รวมทั้งคู่) */
export function utcRangeForBangkokInclusiveYmdRange(
  fromYmd: string,
  toYmd: string
): { start: Date; endExclusive: Date } {
  const { start } = utcRangeForBangkokCalendarDay(fromYmd)
  const { endExclusive } = utcRangeForBangkokCalendarDay(toYmd)
  return { start, endExclusive }
}

/** First calendar day of the month containing ymd (Bangkok YYYY-MM-DD). */
export function readZMonthStartYmd(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`
}

/** Add calendar days to a Bangkok YYYY-MM-DD (no DST). */
export function addBangkokCalendarDays(ymd: string, days: number): string {
  const { start } = utcRangeForBangkokCalendarDay(ymd)
  const next = new Date(start.getTime() + days * 24 * 60 * 60 * 1000)
  return bangkokCalendarYmd(next)
}
