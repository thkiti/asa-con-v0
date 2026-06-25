export const InvoiceVoucherErrorCodes = {
  INVALID_TRANSITION: "INVALID_TRANSITION",
  IMMUTABLE_ENTRY: "IMMUTABLE_ENTRY",
  ENTRY_NOT_FOUND: "ENTRY_NOT_FOUND",
  DOCUMENT_NUMBER_ALLOCATION_FAILED: "DOCUMENT_NUMBER_ALLOCATION_FAILED",
  NOT_DRAFT: "NOT_DRAFT",
  INVALID_LINE: "INVALID_LINE",
  ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
  ACCOUNT_INACTIVE: "ACCOUNT_INACTIVE",
  EMPTY_ALLOCATION: "EMPTY_ALLOCATION",
  INSUFFICIENT_LINES: "INSUFFICIENT_LINES",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  UNBALANCED_VOUCHER: "UNBALANCED_VOUCHER",
} as const

export type InvoiceVoucherErrorCode =
  (typeof InvoiceVoucherErrorCodes)[keyof typeof InvoiceVoucherErrorCodes]

export class InvoiceVoucherError extends Error {
  readonly code: InvoiceVoucherErrorCode
  readonly httpStatus: number

  constructor(
    message: string,
    code: InvoiceVoucherErrorCode,
    httpStatus = 400
  ) {
    super(message)
    this.name = "InvoiceVoucherError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export class InvoiceVoucherPolicyError extends InvoiceVoucherError {
  constructor(
    message: string,
    code: InvoiceVoucherErrorCode = InvoiceVoucherErrorCodes.INVALID_TRANSITION
  ) {
    super(message, code, 400)
    this.name = "InvoiceVoucherPolicyError"
  }
}
