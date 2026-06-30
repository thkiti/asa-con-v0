import { NextResponse } from "next/server"
import { PeriodAdminAuthError } from "@/lib/auth"
import { DocumentArchiveError } from "@/lib/document-archive/errors"

export function documentArchiveApiErrorResponse(
  err: unknown,
  logLabel: string
): NextResponse {
  if (err instanceof PeriodAdminAuthError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  if (err instanceof DocumentArchiveError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  const message = err instanceof Error ? err.message : "Document archive request failed"
  console.error(`${logLabel}:`, err)
  return NextResponse.json(
    { error: message, code: "DOCUMENT_ARCHIVE_ERROR" },
    { status: 500 }
  )
}
