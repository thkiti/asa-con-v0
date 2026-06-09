import { NextResponse } from "next/server"
import { CheckReceiptAuthError } from "@/lib/permissions/check-receipt"
import { CheckReceiptError } from "@/lib/operations/check-receipt-errors"

export function operationApiErrorResponse(
  err: unknown,
  logLabel: string
): NextResponse {
  if (err instanceof CheckReceiptAuthError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  if (err instanceof CheckReceiptError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  const message = err instanceof Error ? err.message : "Internal server error"
  console.error(`${logLabel}:`, err)
  return NextResponse.json({ error: message }, { status: 500 })
}
