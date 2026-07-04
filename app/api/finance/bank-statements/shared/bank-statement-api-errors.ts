import { NextResponse } from "next/server"

import { BankStatementError } from "@/lib/finance/bank-statement"
import { ReportError } from "@/lib/reporting/report-errors"

export function bankStatementErrorResponse(err: unknown, context: string): NextResponse {
  if (err instanceof BankStatementError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
  }

  if (err instanceof ReportError) {
    const status =
      err.code === "UNAUTHORIZED" ? 401 : err.code === "FORBIDDEN" ? 403 : 400
    return NextResponse.json({ error: err.message, code: err.code }, { status })
  }

  console.error(context, err)
  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}
