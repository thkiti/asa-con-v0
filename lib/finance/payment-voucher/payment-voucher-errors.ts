export const PaymentVoucherErrorCodes = {
  INVALID_TRANSITION: "INVALID_TRANSITION",
  IMMUTABLE_ENTRY: "IMMUTABLE_ENTRY",
  ENTRY_NOT_FOUND: "ENTRY_NOT_FOUND",
  DOCUMENT_NUMBER_ALLOCATION_FAILED: "DOCUMENT_NUMBER_ALLOCATION_FAILED",
  NOT_DRAFT: "NOT_DRAFT",
  INVALID_LINE: "INVALID_LINE",
  ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
  ACCOUNT_INACTIVE: "ACCOUNT_INACTIVE",
  INVALID_PAY_FROM_ACCOUNT: "INVALID_PAY_FROM_ACCOUNT",
  EMPTY_ALLOCATION: "EMPTY_ALLOCATION",
  INSUFFICIENT_LINES: "INSUFFICIENT_LINES",
  MISSING_CONTROL_ACCOUNT_LINE: "MISSING_CONTROL_ACCOUNT_LINE",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  UNBALANCED_VOUCHER: "UNBALANCED_VOUCHER",
} as const

export type PaymentVoucherErrorCode =
  (typeof PaymentVoucherErrorCodes)[keyof typeof PaymentVoucherErrorCodes]

export class PaymentVoucherError extends Error {
  readonly code: PaymentVoucherErrorCode
  readonly httpStatus: number

  constructor(
    message: string,
    code: PaymentVoucherErrorCode,
    httpStatus = 400
  ) {
    super(message)
    this.name = "PaymentVoucherError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export class PaymentVoucherPolicyError extends PaymentVoucherError {
  constructor(
    message: string,
    code: PaymentVoucherErrorCode = PaymentVoucherErrorCodes.INVALID_TRANSITION
  ) {
    super(message, code, 400)
    this.name = "PaymentVoucherPolicyError"
  }
}
