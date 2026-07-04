import { NextResponse } from "next/server"

import { BankAccountError } from "@/lib/finance/bank-account"
import { ReportError } from "@/lib/reporting/report-errors"

export function bankAccountErrorResponse(err: unknown, context: string): NextResponse {
  if (err instanceof BankAccountError) {
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
