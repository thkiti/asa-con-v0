export const RevenueVoucherErrorCodes = {
  INVALID_TRANSITION: "INVALID_TRANSITION",
  IMMUTABLE_ENTRY: "IMMUTABLE_ENTRY",
  ENTRY_NOT_FOUND: "ENTRY_NOT_FOUND",
  DOCUMENT_NUMBER_ALLOCATION_FAILED: "DOCUMENT_NUMBER_ALLOCATION_FAILED",
  NOT_DRAFT: "NOT_DRAFT",
  INVALID_LINE: "INVALID_LINE",
  ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
  ACCOUNT_INACTIVE: "ACCOUNT_INACTIVE",
  INVALID_RECEIVE_TO_ACCOUNT: "INVALID_RECEIVE_TO_ACCOUNT",
  EMPTY_ALLOCATION: "EMPTY_ALLOCATION",
  INSUFFICIENT_LINES: "INSUFFICIENT_LINES",
  MISSING_CONTROL_ACCOUNT_LINE: "MISSING_CONTROL_ACCOUNT_LINE",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  UNBALANCED_VOUCHER: "UNBALANCED_VOUCHER",
} as const

export type RevenueVoucherErrorCode =
  (typeof RevenueVoucherErrorCodes)[keyof typeof RevenueVoucherErrorCodes]

export class RevenueVoucherError extends Error {
  readonly code: RevenueVoucherErrorCode
  readonly httpStatus: number

  constructor(
    message: string,
    code: RevenueVoucherErrorCode,
    httpStatus = 400
  ) {
    super(message)
    this.name = "RevenueVoucherError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export class RevenueVoucherPolicyError extends RevenueVoucherError {
  constructor(
    message: string,
    code: RevenueVoucherErrorCode = RevenueVoucherErrorCodes.INVALID_TRANSITION
  ) {
    super(message, code, 400)
    this.name = "RevenueVoucherPolicyError"
  }
}
