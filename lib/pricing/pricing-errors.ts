export class PricingDomainError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus: number) {
    super(message)
    this.name = "PricingDomainError"
    this.code = code
    this.httpStatus = httpStatus
  }
}
