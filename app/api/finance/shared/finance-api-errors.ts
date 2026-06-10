import { NextResponse } from "next/server"
import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { ClosePolicyError } from "@/lib/finance/close-policy"
import { CloseGateError, toCloseGateErrorPayload } from "@/lib/finance/close-gate"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { ReopenRequestError } from "@/lib/finance/reopen-request-errors"
import { ReconciliationError } from "@/lib/finance/reconciliation-errors"
import { ReconciliationSnapshotError } from "@/lib/finance/reconciliation-snapshot-errors"
import { GlAccountImportError } from "@/lib/finance/gl-account-import-errors"
import { VoucherReadError } from "@/lib/finance/voucher-read-errors"
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
  if (
    code === "PERIOD_NOT_FOUND" ||
    code === "CLOSE_EVIDENCE_NOT_FOUND" ||
    code === "REOPEN_REQUEST_NOT_FOUND" ||
    code === "ACCOUNT_NOT_FOUND" ||
    code === "JOURNAL_NOT_FOUND" ||
    code === "NOT_FOUND"
  ) {
    return 404
  }
  if (
    code === "FORBIDDEN" ||
    code === "REOPEN_SELF_APPROVAL_FORBIDDEN" ||
    code === "REOPEN_APPROVER_FORBIDDEN"
  ) {
    return 403
  }
  if (
    code === "REOPEN_APPROVAL_REQUIRED" ||
    code === "REOPEN_REQUEST_PENDING" ||
    code === "REOPEN_REQUEST_NOT_PENDING" ||
    code === "REOPEN_PERIOD_STATE_CHANGED" ||
    code === "JOURNAL_ALREADY_REVERSED" ||
    code === "PERIOD_ALREADY_HARD_CLOSED"
  ) {
    return 409
  }
  return 400
}

export function financeErrorResponse(
  err: unknown,
  logLabel: string
): NextResponse {
  if (err instanceof GlAccountImportError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: statusForCode(err.code) }
    )
  }

  if (err instanceof VoucherReadError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: statusForCode(err.code) }
    )
  }

  if (err instanceof ReconciliationSnapshotError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: statusForCode(err.code) }
    )
  }

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
      { status: statusForCode(err.code) }
    )
  }

  if (err instanceof CloseGateError) {
    return NextResponse.json(toCloseGateErrorPayload(err), { status: 409 })
  }

  if (err instanceof ReopenRequestError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: statusForCode(err.code) }
    )
  }

  if (err instanceof FinancePostingError) {
    const status = statusForCode(err.code)
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status }
    )
  }

  const message = err instanceof Error ? err.message : "Finance request failed"
  console.error(`${logLabel}:`, err)
  return NextResponse.json({ error: message }, { status: 500 })
}
