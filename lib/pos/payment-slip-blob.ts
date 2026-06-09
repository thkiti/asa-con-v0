const PAYMENT_SLIP_PREFIX = "payment-slips"

/** REC-{BranchCode}-{YYYYMM}-{Seq4} */
const RECEIPT_NO_PATTERN = /^REC-[A-Z0-9]+-\d{6}-\d{4}$/i

export function assertSafeBranchCode(branchCode: string): string {
  const code = String(branchCode ?? "").trim().toUpperCase()
  if (!/^[A-Z0-9]+$/.test(code)) {
    throw new Error(`Invalid branch code: ${branchCode}`)
  }
  return code
}

export function assertSafeReceiptNo(receiptNo: string): string {
  const value = String(receiptNo ?? "").trim().toUpperCase()
  if (!RECEIPT_NO_PATTERN.test(value)) {
    throw new Error(`Invalid receipt number: ${receiptNo}`)
  }
  return value
}

export function buildPaymentSlipBlobPath(
  branchCode: string,
  receiptNo: string
): string {
  const safeBranch = assertSafeBranchCode(branchCode)
  const safeReceipt = assertSafeReceiptNo(receiptNo)
  return `${PAYMENT_SLIP_PREFIX}/${safeBranch}/${safeReceipt}.jpg`
}

export { PAYMENT_SLIP_PREFIX, RECEIPT_NO_PATTERN }
