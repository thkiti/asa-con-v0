export const DocumentArchiveErrorCodes = {
  INVALID_PATH: "INVALID_PATH",
  INVALID_RECEIPT_NO: "INVALID_RECEIPT_NO",
  PDF_MISSING: "PDF_MISSING",
  PDF_METADATA_INCOMPLETE: "PDF_METADATA_INCOMPLETE",
  ARCHIVE_NOT_FOUND: "ARCHIVE_NOT_FOUND",
} as const

export type DocumentArchiveErrorCode =
  (typeof DocumentArchiveErrorCodes)[keyof typeof DocumentArchiveErrorCodes]

export class DocumentArchiveError extends Error {
  readonly code: DocumentArchiveErrorCode
  readonly httpStatus: number

  constructor(
    message: string,
    code: DocumentArchiveErrorCode,
    httpStatus = 400
  ) {
    super(message)
    this.name = "DocumentArchiveError"
    this.code = code
    this.httpStatus = httpStatus
  }
}
