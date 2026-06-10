export const DocumentErrorCodes = {
  DOCUMENT_NOT_FOUND: "DOCUMENT_NOT_FOUND",
  INVALID_DOCUMENT_STATUS: "INVALID_DOCUMENT_STATUS",
  DOCUMENT_IMMUTABLE: "DOCUMENT_IMMUTABLE",
  EMPTY_DOCUMENT: "EMPTY_DOCUMENT",
  INVALID_TRANSFER_ROUTE: "INVALID_TRANSFER_ROUTE",
  INVALID_QUANTITY: "INVALID_QUANTITY",
  INVALID_PRODUCT: "INVALID_PRODUCT",
  INVALID_TRANSITION: "INVALID_TRANSITION",
  STOCK_COUNT_ALREADY_SUBMITTED: "STOCK_COUNT_ALREADY_SUBMITTED",
} as const

export type DocumentErrorCode =
  (typeof DocumentErrorCodes)[keyof typeof DocumentErrorCodes]

export class DocumentError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus = 400) {
    super(message)
    this.name = "DocumentError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export class DocumentPolicyError extends DocumentError {
  constructor(
    message: string,
    code: string = DocumentErrorCodes.INVALID_TRANSITION
  ) {
    super(message, code, 400)
    this.name = "DocumentPolicyError"
  }
}
