const VOUCHER_RUNNING_NUMBER_PAD = 5

export type VoucherInquiryVoucherNoSearch =
  | { mode: "contains"; value: string }
  | { mode: "equals"; value: string }

export function isFullVoucherNoInput(raw: string): boolean {
  const trimmed = raw.trim()
  return /^V-/i.test(trimmed) || trimmed.includes("-")
}

export function padVoucherRunningNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (!digits) return raw.trim()
  return digits.padStart(VOUCHER_RUNNING_NUMBER_PAD, "0")
}

export function buildPeriodVoucherNo(periodKey: string, runningNo: string): string {
  return `V-${periodKey.trim()}-${padVoucherRunningNumber(runningNo)}`
}

/**
 * Resolve voucher-no filter for inquiry list.
 * - Full voucher numbers use contains (case-insensitive).
 * - Running number + period uses exact padded V-{periodKey}-{seq}.
 * - Running number without period matches suffix -{padded}.
 */
export function resolveVoucherInquiryVoucherNoSearch(
  voucherNo: string | undefined,
  periodKey: string | undefined
): VoucherInquiryVoucherNoSearch | null {
  const raw = voucherNo?.trim()
  if (!raw) return null

  if (isFullVoucherNoInput(raw)) {
    return { mode: "contains", value: raw }
  }

  const period = periodKey?.trim()
  const digits = raw.replace(/\D/g, "")
  if (!digits) {
    return { mode: "contains", value: raw }
  }

  if (period) {
    return { mode: "equals", value: buildPeriodVoucherNo(period, digits) }
  }

  return { mode: "contains", value: `-${padVoucherRunningNumber(digits)}` }
}
