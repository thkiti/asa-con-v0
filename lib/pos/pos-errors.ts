export class PosLookupError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus = 400) {
    super(message)
    this.name = "PosLookupError"
    this.code = code
    this.httpStatus = httpStatus
  }
}
