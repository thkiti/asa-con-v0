export const EndErrorCodes = {
  END_NOT_FOUND: "END_NOT_FOUND",
  INVALID_PERIOD: "INVALID_PERIOD",
  INVALID_INPUT: "INVALID_INPUT",
  END_LOCKED: "END_LOCKED",
  END_NOT_LOCKED: "END_NOT_LOCKED",
  PRIOR_END_REQUIRED: "PRIOR_END_REQUIRED",
  PRIOR_END_NOT_LOCKED: "PRIOR_END_NOT_LOCKED",
  COMPLETENESS_BLOCKED: "COMPLETENESS_BLOCKED",
  PERIOD_HARD_CLOSED: "PERIOD_HARD_CLOSED",
  DOWNSTREAM_END_EXISTS: "DOWNSTREAM_END_EXISTS",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  IMPORT_NOT_ALLOWED: "IMPORT_NOT_ALLOWED",
  IMPORT_VALIDATION_FAILED: "IMPORT_VALIDATION_FAILED",
  INVALID_STATUS: "INVALID_STATUS",
  DOCUMENT_NOT_FOUND: "DOCUMENT_NOT_FOUND",
  CONFLICT: "CONFLICT",
} as const

export type EndErrorCode = (typeof EndErrorCodes)[keyof typeof EndErrorCodes]

export class EndError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus = 400) {
    super(message)
    this.name = "EndError"
    this.code = code
    this.httpStatus = httpStatus
  }
}
