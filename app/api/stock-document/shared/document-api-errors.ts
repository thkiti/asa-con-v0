import { NextResponse } from "next/server"
import {
  documentRouteErrorMessage,
  mapDocumentRouteError,
} from "@/lib/stock/document/document-route-errors"

export { normalizeDocumentErrorCode } from "@/lib/stock/document/document-route-errors"

export function documentErrorResponse(
  err: unknown,
  logLabel: string
): NextResponse {
  const mapped = mapDocumentRouteError(err)
  if (mapped) {
    return NextResponse.json(mapped.body, { status: mapped.status })
  }

  const message = documentRouteErrorMessage(err)
  console.error(`${logLabel}:`, err)
  return NextResponse.json({ error: message }, { status: 500 })
}
