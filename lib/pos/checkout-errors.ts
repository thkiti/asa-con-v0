export class CheckoutError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus = 400) {
    super(message)
    this.name = "CheckoutError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export function assertCheckoutRequiredString(
  value: unknown,
  field: string
): string {
  const s = String(value ?? "").trim()
  if (!s) {
    throw new CheckoutError(`checkout: ${field} is required`, "MISSING_FIELD", 400)
  }
  return s
}