export const PettyCashVoucherErrorCodes = {
  INVALID_TRANSITION: "INVALID_TRANSITION",
  IMMUTABLE_ENTRY: "IMMUTABLE_ENTRY",
  ENTRY_NOT_FOUND: "ENTRY_NOT_FOUND",
  DOCUMENT_NUMBER_ALLOCATION_FAILED: "DOCUMENT_NUMBER_ALLOCATION_FAILED",
  NOT_DRAFT: "NOT_DRAFT",
  INVALID_LINE: "INVALID_LINE",
  ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
  ACCOUNT_INACTIVE: "ACCOUNT_INACTIVE",
  INVALID_PETTY_CASH_ACCOUNT: "INVALID_PETTY_CASH_ACCOUNT",
  EMPTY_ALLOCATION: "EMPTY_ALLOCATION",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  UNBALANCED_VOUCHER: "UNBALANCED_VOUCHER",
} as const

export type PettyCashVoucherErrorCode =
  (typeof PettyCashVoucherErrorCodes)[keyof typeof PettyCashVoucherErrorCodes]

export class PettyCashVoucherError extends Error {
  readonly code: PettyCashVoucherErrorCode
  readonly httpStatus: number

  constructor(
    message: string,
    code: PettyCashVoucherErrorCode,
    httpStatus = 400
  ) {
    super(message)
    this.name = "PettyCashVoucherError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export class PettyCashVoucherPolicyError extends PettyCashVoucherError {
  constructor(
    message: string,
    code: PettyCashVoucherErrorCode = PettyCashVoucherErrorCodes.INVALID_TRANSITION
  ) {
    super(message, code, 400)
    this.name = "PettyCashVoucherPolicyError"
  }
}
