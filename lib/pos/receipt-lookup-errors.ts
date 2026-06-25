export const ReceiptLookupErrorCodes = {
  INVALID_DATE: "INVALID_DATE",
  INVALID_DATE_RANGE: "INVALID_DATE_RANGE",
  RECEIPT_NOT_FOUND: "RECEIPT_NOT_FOUND",
  PDF_NOT_READY: "PDF_NOT_READY",
  BRANCH_MISMATCH: "BRANCH_MISMATCH",
} as const

export type ReceiptLookupErrorCode =
  (typeof ReceiptLookupErrorCodes)[keyof typeof ReceiptLookupErrorCodes]

export class ReceiptLookupError extends Error {
  readonly code: ReceiptLookupErrorCode
  readonly httpStatus: number

  constructor(
    message: string,
    code: ReceiptLookupErrorCode,
    httpStatus = 400
  ) {
    super(message)
    this.name = "ReceiptLookupError"
    this.code = code
    this.httpStatus = httpStatus
  }
}
