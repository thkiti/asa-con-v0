const PAY_IN_SLIP_PREFIX = "finance/pos-settlement/pay-in"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function assertSafeCollectorReportId(collectorReportId: string): string {
  const id = String(collectorReportId ?? "").trim()
  if (!UUID_PATTERN.test(id)) {
    throw new Error(`Invalid collector report id: ${collectorReportId}`)
  }
  return id
}

export function buildPayInSlipBlobPath(collectorReportId: string): string {
  const safeId = assertSafeCollectorReportId(collectorReportId)
  return `${PAY_IN_SLIP_PREFIX}/${safeId}.jpg`
}

export { PAY_IN_SLIP_PREFIX }
