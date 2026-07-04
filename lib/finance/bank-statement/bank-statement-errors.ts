export const BankStatementErrorCodes = {
  VALIDATION: "VALIDATION",
  NOT_FOUND: "NOT_FOUND",
  DUPLICATE: "DUPLICATE",
  BANK_ACCOUNT_NOT_FOUND: "BANK_ACCOUNT_NOT_FOUND",
  READ_ONLY: "READ_ONLY",
} as const

export type BankStatementErrorCode =
  (typeof BankStatementErrorCodes)[keyof typeof BankStatementErrorCodes]

export class BankStatementError extends Error {
  readonly code: BankStatementErrorCode
  readonly status: number

  constructor(
    message: string,
    code: BankStatementErrorCode,
    status = 400
  ) {
    super(message)
    this.name = "BankStatementError"
    this.code = code
    this.status = status
  }
}
