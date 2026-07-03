export const BankReconciliationErrorCodes = {
  NOT_FOUND: "BANK_RECONCILIATION_NOT_FOUND",
  DUPLICATE: "BANK_RECONCILIATION_DUPLICATE",
  VALIDATION: "VALIDATION_ERROR",
  IMMUTABLE: "BANK_RECONCILIATION_IMMUTABLE",
  INVALID_TRANSITION: "BANK_RECONCILIATION_INVALID_TRANSITION",
  ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
  PERIOD_NOT_FOUND: "PERIOD_NOT_FOUND",
} as const

export type BankReconciliationErrorCode =
  (typeof BankReconciliationErrorCodes)[keyof typeof BankReconciliationErrorCodes]

export class BankReconciliationError extends Error {
  readonly code: BankReconciliationErrorCode
  readonly status: number

  constructor(
    message: string,
    code: BankReconciliationErrorCode,
    status = 400
  ) {
    super(message)
    this.name = "BankReconciliationError"
    this.code = code
    this.status = status
  }
}
