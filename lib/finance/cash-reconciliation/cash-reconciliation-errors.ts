export const CashReconciliationErrorCodes = {
  NOT_FOUND: "CASH_RECONCILIATION_NOT_FOUND",
  DUPLICATE: "CASH_RECONCILIATION_DUPLICATE",
  VALIDATION: "VALIDATION_ERROR",
  IMMUTABLE: "CASH_RECONCILIATION_IMMUTABLE",
  INVALID_TRANSITION: "CASH_RECONCILIATION_INVALID_TRANSITION",
  ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
} as const

export type CashReconciliationErrorCode =
  (typeof CashReconciliationErrorCodes)[keyof typeof CashReconciliationErrorCodes]

export class CashReconciliationError extends Error {
  readonly code: CashReconciliationErrorCode
  readonly status: number

  constructor(message: string, code: CashReconciliationErrorCode, status = 400) {
    super(message)
    this.name = "CashReconciliationError"
    this.code = code
    this.status = status
  }
}
