import { NextResponse } from "next/server"
import { DocumentArchiveError } from "@/lib/document-archive/errors"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { ReceiptLookupError } from "@/lib/pos/receipt-lookup-errors"
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

  if (err instanceof ReceiptLookupError) {
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

  const message = err instanceof Error ? err.message : "POS request failed"
  console.error(`${logLabel}:`, err)
  return NextResponse.json({ error: message, code: "POS_ERROR" }, { status: 500 })
}
