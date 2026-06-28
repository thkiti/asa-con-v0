const PAY_IN_SLIP_PREFIX = "finance/pos-settlement/pay-in"

/** COL-{branch}-{YYYYMM}-{seq} */
const COLLECT_NO_PATTERN = /^COL-[A-Z0-9]+-\d{6}-\d{4,}$/i

export function assertSafeCollectNo(collectNo: string): string {
  const value = String(collectNo ?? "").trim().toUpperCase()
  if (!COLLECT_NO_PATTERN.test(value)) {
    throw new Error(`Invalid collect number: ${collectNo}`)
  }
  return value
}

export function assertSafeStaffId(staffId: string): string {
  const value = String(staffId ?? "").trim()
  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    throw new Error(`Invalid staff id: ${staffId}`)
  }
  return value
}

export function buildPayInSlipBlobPath(collectNo: string, staffId: string): string {
  const safeCollectNo = assertSafeCollectNo(collectNo)
  const safeStaffId = assertSafeStaffId(staffId)
  return `${PAY_IN_SLIP_PREFIX}/${safeCollectNo}-${safeStaffId}.jpg`
}

export { PAY_IN_SLIP_PREFIX, COLLECT_NO_PATTERN }
