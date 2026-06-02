export class DocumentError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus = 400) {
    super(message)
    this.name = "DocumentError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export class DocumentPolicyError extends DocumentError {
  constructor(message: string, code = "INVALID_TRANSITION") {
    super(message, code, 400)
    this.name = "DocumentPolicyError"
  }
}
