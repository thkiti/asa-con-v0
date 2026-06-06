import { NextResponse } from "next/server"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { WorktimeError } from "@/lib/pos/worktime-errors"
import { StockDocumentAuthError } from "@/lib/stock/document-read/document-access"

export function posApiErrorResponse(err: unknown, logLabel: string): NextResponse {
  if (err instanceof StockDocumentAuthError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  if (err instanceof WorktimeError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  if (err instanceof PosLookupError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  const message = err instanceof Error ? err.message : "POS request failed"
  console.error(`${logLabel}:`, err)
  return NextResponse.json({ error: message, code: "POS_ERROR" }, { status: 500 })
}
