/**
 * Build full collector number for lookup search from POS-style year/month/running fields.
 * COL-{BranchCode}-{YYYYMM}-{Seq4}
 */
export function buildCollectorLookupNo(
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
  return `COL-${code}-${yyyymm}-${seq}`
}

const COLLECTOR_NO_PATTERN = /^COL-[A-Z0-9]+-(\d{4})(\d{2})-(\d{4})$/i

export function parseCollectorRunningSeq(collectNo: string): string | null {
  const match = COLLECTOR_NO_PATTERN.exec(String(collectNo ?? "").trim())
  return match ? match[3] : null
}

export {
  normalizeReceiptLookupRunningNo as normalizeCollectorLookupRunningNo,
  appendReceiptLookupRunningDigit as appendCollectorLookupRunningDigit,
  RECEIPT_LOOKUP_YEAR_OPTIONS as COLLECTOR_LOOKUP_YEAR_OPTIONS,
  RECEIPT_LOOKUP_MONTH_OPTIONS as COLLECTOR_LOOKUP_MONTH_OPTIONS,
} from "@/lib/pos-ui/build-receipt-lookup-no"
