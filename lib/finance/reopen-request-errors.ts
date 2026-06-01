export type ReopenRequestErrorCode =
  | "REOPEN_APPROVAL_REQUIRED"
  | "REOPEN_REQUEST_PENDING"
  | "REOPEN_REQUEST_NOT_FOUND"
  | "REOPEN_REQUEST_NOT_PENDING"
  | "REOPEN_PERIOD_STATE_CHANGED"
  | "REOPEN_SELF_APPROVAL_FORBIDDEN"
  | "REOPEN_APPROVER_FORBIDDEN"
  | "VALIDATION_ERROR"
  | "PERIOD_NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_REOPEN_TRANSITION"

export class ReopenRequestError extends Error {
  readonly code: ReopenRequestErrorCode

  constructor(message: string, code: ReopenRequestErrorCode) {
    super(message)
    this.name = "ReopenRequestError"
    this.code = code
  }
}
