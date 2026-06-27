/**
 * Build full refund number for lookup search from POS-style year/month/running fields.
 * REF-{BranchCode}-{YYYYMM}-{Seq4}
 */
export function buildRefundLookupNo(
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
  return `REF-${code}-${yyyymm}-${seq}`
}

const REFUND_NO_PATTERN = /^REF-[A-Z0-9]+-(\d{4})(\d{2})-(\d{4})$/i

export function parseRefundRunningSeq(refundNo: string): string | null {
  const match = REFUND_NO_PATTERN.exec(String(refundNo ?? "").trim())
  return match ? match[3] : null
}

export {
  normalizeReceiptLookupRunningNo as normalizeRefundLookupRunningNo,
  appendReceiptLookupRunningDigit as appendRefundLookupRunningDigit,
  RECEIPT_LOOKUP_YEAR_OPTIONS as REFUND_LOOKUP_YEAR_OPTIONS,
  RECEIPT_LOOKUP_MONTH_OPTIONS as REFUND_LOOKUP_MONTH_OPTIONS,
} from "@/lib/pos-ui/build-receipt-lookup-no"
