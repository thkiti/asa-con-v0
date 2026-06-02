import { DocumentErrorCodes } from "@/lib/stock/document/document-errors"

export const StockUiErrorCodes = {
  ...DocumentErrorCodes,
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  BRANCH_ACCESS_DENIED: "BRANCH_ACCESS_DENIED",
  MISSING_STAFF_ID: "MISSING_STAFF_ID",
  REQUEST_FAILED: "REQUEST_FAILED",
} as const

const MESSAGE_BY_CODE: Record<string, string> = {
  [DocumentErrorCodes.DOCUMENT_NOT_FOUND]: "Document not found.",
  [DocumentErrorCodes.INVALID_DOCUMENT_STATUS]:
    "This action is not allowed for the current document status.",
  [DocumentErrorCodes.DOCUMENT_IMMUTABLE]:
    "Posted or cancelled documents cannot be changed.",
  [DocumentErrorCodes.EMPTY_DOCUMENT]:
    "Add at least one line with a non-zero quantity.",
  [DocumentErrorCodes.INVALID_TRANSFER_ROUTE]:
    "Transfer must be between shop and HO only.",
  [DocumentErrorCodes.INVALID_QUANTITY]: "Check quantity for this document type.",
  [DocumentErrorCodes.INVALID_PRODUCT]: "Each line must include a product.",
  [DocumentErrorCodes.INVALID_TRANSITION]:
    "This workflow step is not allowed.",
  [StockUiErrorCodes.UNAUTHENTICATED]: "Please sign in again.",
  [StockUiErrorCodes.FORBIDDEN]: "You do not have permission for this action.",
  [StockUiErrorCodes.BRANCH_ACCESS_DENIED]:
    "You may only access documents for your branch.",
  [StockUiErrorCodes.MISSING_STAFF_ID]: "Session is missing staff identity.",
  [StockUiErrorCodes.REQUEST_FAILED]: "Request failed. Try again.",
  PERIOD_CLOSED: "The accounting period is closed. Posting is blocked.",
  PERIOD_NOT_OPENED: "The accounting period is not open for posting.",
}

export class StockDocumentUiError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "StockDocumentUiError"
    this.code = code
  }
}

export function messageForDocumentErrorCode(code: string | undefined): string {
  if (!code) return MESSAGE_BY_CODE[StockUiErrorCodes.REQUEST_FAILED]
  return MESSAGE_BY_CODE[code] ?? code
}

export function toStockDocumentUiError(
  err: unknown,
  fallback = "Request failed"
): StockDocumentUiError {
  if (err instanceof StockDocumentUiError) return err
  if (err instanceof Error) {
    const withCode = err as Error & { code?: string }
    const code =
      typeof withCode.code === "string"
        ? withCode.code
        : StockUiErrorCodes.REQUEST_FAILED
    return new StockDocumentUiError(
      messageForDocumentErrorCode(code) || err.message || fallback,
      code
    )
  }
  return new StockDocumentUiError(fallback, StockUiErrorCodes.REQUEST_FAILED)
}
