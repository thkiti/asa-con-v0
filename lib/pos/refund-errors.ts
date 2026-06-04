export class RefundError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus = 400) {
    super(message)
    this.name = "RefundError"
    this.code = code
    this.httpStatus = httpStatus
  }
}
