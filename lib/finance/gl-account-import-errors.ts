export type GlAccountImportErrorCode =
  | "MISSING_ACCOUNT_CODE"
  | "INVALID_ACCOUNT_CODE"
  | "MISSING_ACCOUNT_NAME"
  | "INVALID_ACCOUNT_TYPE"
  | "INVALID_NORMAL_BALANCE"
  | "NORMAL_BALANCE_TYPE_MISMATCH"
  | "INVALID_IS_ACTIVE"
  | "SELF_PARENT"
  | "DUPLICATE_CODE_IN_FILE"
  | "ORPHAN_PARENT"
  | "CIRCULAR_PARENT"
  | "NO_VALID_ROWS"
  | "MISSING_REQUIRED_HEADER"
  | "FILE_TOO_LARGE"
  | "BLOCKED_HAS_JOURNAL_LINES"
  | "BLOCKED_ACCOUNT_TYPE_CHANGE"
  | "VALIDATION_FAILED"
  | "EMPTY_FILE"

export class GlAccountImportError extends Error {
  readonly code: GlAccountImportErrorCode

  constructor(message: string, code: GlAccountImportErrorCode) {
    super(message)
    this.name = "GlAccountImportError"
    this.code = code
  }
}
