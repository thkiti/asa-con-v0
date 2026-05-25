import { NextResponse } from "next/server"
import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { ClosePolicyError } from "@/lib/finance/close-policy"
import { ReconciliationError } from "@/lib/finance/reconciliation-errors"
import { InvalidDateRangeError, ReportError } from "@/lib/reporting/report-errors"

export function parseAccountingPeriodStatus(
  value: unknown
): AccountingPeriodStatus | null {
  const raw = String(value ?? "").trim().toUpperCase()
  if ((Object.values(AccountingPeriodStatus) as string[]).includes(raw)) {
    return raw as AccountingPeriodStatus
  }
  return null
}

function statusForCode(code: string): number {
  if (code === "PERIOD_NOT_FOUND" || code === "ACCOUNT_NOT_FOUND") {
    return 404
  }
  if (code === "FORBIDDEN") {
    return 403
  }
  return 400
}

export function financeErrorResponse(
  err: unknown,
  logLabel: string
): NextResponse {
  if (
    err instanceof ReconciliationError ||
    err instanceof ClosePolicyError ||
    err instanceof InvalidDateRangeError
  ) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: statusForCode(err.code) }
    )
  }

  if (err instanceof ReportError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: 400 }
    )
  }

  const message = err instanceof Error ? err.message : "Finance request failed"
  console.error(`${logLabel}:`, err)
  return NextResponse.json({ error: message }, { status: 500 })
}
