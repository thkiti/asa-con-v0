export class CheckReceiptError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus: number) {
    super(message)
    this.name = "CheckReceiptError"
    this.code = code
    this.httpStatus = httpStatus
  }
}
