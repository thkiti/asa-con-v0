import { NextResponse } from "next/server"
import { documentErrorResponse } from "@/app/api/stock-document/shared/document-api-errors"
import { EndError } from "@/lib/stock/end"

export function endErrorResponse(err: unknown, logLabel: string): NextResponse {
  if (err instanceof EndError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }
  return documentErrorResponse(err, logLabel)
}
