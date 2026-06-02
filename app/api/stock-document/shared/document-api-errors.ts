import { NextResponse } from "next/server"
import { StockDocumentAuthError } from "@/lib/stock/document-read/document-access"
import {
  documentRouteErrorMessage,
  mapDocumentRouteError,
} from "@/lib/stock/document/document-route-errors"

export { normalizeDocumentErrorCode } from "@/lib/stock/document/document-route-errors"

export function documentErrorResponse(
  err: unknown,
  logLabel: string
): NextResponse {
  if (err instanceof StockDocumentAuthError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  const mapped = mapDocumentRouteError(err)
  if (mapped) {
    return NextResponse.json(mapped.body, { status: mapped.status })
  }

  const message = documentRouteErrorMessage(err)
  console.error(`${logLabel}:`, err)
  return NextResponse.json({ error: message }, { status: 500 })
}
