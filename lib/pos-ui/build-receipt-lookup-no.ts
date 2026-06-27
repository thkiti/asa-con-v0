/**
 * Build full receipt number for lookup search from POS-style year/month/running fields.
 * REC-{BranchCode}-{YYYYMM}-{Seq4}
 */
export function buildReceiptLookupNo(
  branchCode: string,
  year: number,
  month: number,
  runningNo: string
): string | null {
  const code = String(branchCode ?? "").trim()
  if (!code) return null

  const digits = String(runningNo ?? "").replace(/\D/g, "")
  if (!digits) return null

  const y = Number(year)
  const m = Number(month)
  if (!Number.isFinite(y) || y < 2000 || y > 2100) return null
  if (!Number.isFinite(m) || m < 1 || m > 12) return null

  const yyyymm = `${y}${String(m).padStart(2, "0")}`
  const seq = digits.padStart(4, "0").slice(-4)
  return `REC-${code}-${yyyymm}-${seq}`
}

/** Keep only digit characters, max 4 — running receipt sequence. */
export function normalizeReceiptLookupRunningNo(value: string): string {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 4)
}

const RECEIPT_NO_PATTERN = /^REC-[A-Z0-9]+-(\d{4})(\d{2})-(\d{4})$/i

export function parseReceiptYearMonthFromNo(
  receiptNo: string
): { year: number; month: number } | null {
  const match = RECEIPT_NO_PATTERN.exec(String(receiptNo ?? "").trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null
  return { year, month }
}

export function parseReceiptRunningSeq(receiptNo: string): string | null {
  const match = RECEIPT_NO_PATTERN.exec(String(receiptNo ?? "").trim())
  return match ? match[3] : null
}

/** Running sequence values from receipt lookup rows, preserving API order and skipping duplicates. */
export function runningNumbersFromReceiptLookupRows(
  receipts: ReadonlyArray<{ receiptNo: string }>
): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const row of receipts) {
    const running = parseReceiptRunningSeq(row.receiptNo)
    if (!running || seen.has(running)) continue
    seen.add(running)
    result.push(running)
  }
  return result
}

/**
 * Default running number from POS next-receipt preview when it matches year/month.
 * Next preview REC-…-0114 → latest issued running no 0113.
 */
export function defaultRunningNoFromNextPreview(
  nextReceiptNo: string | null | undefined,
  year: number,
  month: number
): string {
  const trimmed = String(nextReceiptNo ?? "").trim()
  if (!trimmed) return ""

  const ym = parseReceiptYearMonthFromNo(trimmed)
  if (!ym || ym.year !== year || ym.month !== month) return ""

  const seq = parseReceiptRunningSeq(trimmed)
  if (!seq) return ""

  const n = Number.parseInt(seq, 10)
  if (!Number.isFinite(n) || n <= 1) return ""
  return String(n - 1).padStart(4, "0")
}

/** Append a keypad digit to the running receipt number buffer (max 4). */
export function appendReceiptLookupRunningDigit(
  current: string,
  digit: string
): string {
  return normalizeReceiptLookupRunningNo(current + digit)
}

export const RECEIPT_LOOKUP_YEAR_OPTIONS = Array.from(
  { length: 11 },
  (_, index) => new Date().getFullYear() - 5 + index
)

export const RECEIPT_LOOKUP_MONTH_OPTIONS = Array.from(
  { length: 12 },
  (_, index) => index + 1
)
