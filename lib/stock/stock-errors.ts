export class StockLedgerError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "StockLedgerError"
    this.code = code
  }
}

export function assertRequiredString(
  value: unknown,
  field: string,
  fn: string
): string {
  const s = String(value ?? "").trim()
  if (!s) {
    throw new StockLedgerError(`${fn}: ${field} is required`, "MISSING_FIELD")
  }
  return s
}

/** Positive integer qty for issue/receive (zero returns null = skip). */
export function parsePositiveQtyOrSkip(
  raw: unknown,
  fn: string
): number | null {
  if (raw === 0 || raw === "0") return null
  const qty = Math.trunc(Number(raw))
  if (!Number.isFinite(qty) || qty === 0) return null
  if (qty < 0) {
    throw new StockLedgerError(
      `${fn}: qty must be a positive integer (got ${raw})`,
      "INVALID_QTY"
    )
  }
  return qty
}

export function assertProductId(productId: unknown, fn: string): string {
  const id = String(productId ?? "").trim()
  if (!id) {
    throw new StockLedgerError(
      `${fn}: productId is required on every item`,
      "MISSING_PRODUCT"
    )
  }
  return id
}