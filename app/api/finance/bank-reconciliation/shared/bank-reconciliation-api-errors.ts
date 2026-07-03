import { NextResponse } from "next/server"
import { PeriodAdminAuthError } from "@/lib/auth"
import { BankReconciliationError } from "@/lib/finance/bank-reconciliation"

export function bankReconciliationErrorResponse(
  err: unknown,
  context: string
): NextResponse {
  if (err instanceof PeriodAdminAuthError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  if (err instanceof BankReconciliationError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.status }
    )
  }

  console.error(context, err)
  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  )
}
