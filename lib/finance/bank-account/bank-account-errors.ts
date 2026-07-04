export const BankAccountErrorCodes = {
  VALIDATION: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  DUPLICATE: "DUPLICATE",
  GL_ACCOUNT_NOT_FOUND: "GL_ACCOUNT_NOT_FOUND",
} as const

export type BankAccountErrorCode =
  (typeof BankAccountErrorCodes)[keyof typeof BankAccountErrorCodes]

export class BankAccountError extends Error {
  readonly code: BankAccountErrorCode
  readonly status: number

  constructor(message: string, code: BankAccountErrorCode, status = 400) {
    super(message)
    this.name = "BankAccountError"
    this.code = code
    this.status = status
  }
}
