import {
  DocumentError,
  DocumentErrorCodes,
  DocumentPolicyError,
} from "./document-errors"

const LEGACY_CODE_MAP: Record<string, string> = {
  NOT_FOUND: DocumentErrorCodes.DOCUMENT_NOT_FOUND,
  IMMUTABLE_DOCUMENT: DocumentErrorCodes.DOCUMENT_IMMUTABLE,
}

export type DocumentRouteErrorBody = {
  error: string
  code: string
}

export type DocumentRouteErrorResult = {
  status: number
  body: DocumentRouteErrorBody
}

export function normalizeDocumentErrorCode(code: string): string {
  return LEGACY_CODE_MAP[code] ?? code
}

/** Maps domain document errors to HTTP status + JSON body (no Next.js dependency). */
export function mapDocumentRouteError(
  err: unknown
): DocumentRouteErrorResult | null {
  if (err instanceof DocumentError) {
    return {
      status: err.httpStatus,
      body: {
        error: err.message,
        code: normalizeDocumentErrorCode(err.code),
      },
    }
  }

  if (err instanceof DocumentPolicyError) {
    const code = normalizeDocumentErrorCode(err.code)
    const status =
      code === DocumentErrorCodes.DOCUMENT_NOT_FOUND ? 404 : err.httpStatus
    return {
      status,
      body: { error: err.message, code },
    }
  }

  return null
}

export function documentRouteErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Stock document request failed"
}
