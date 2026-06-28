import { PeriodAdminAuthError } from "@/lib/auth"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { ReportError } from "@/lib/reporting/report-errors"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "./pos-settlement-errors"

export type BankDepositRouteErrorBody = {
  error: string
  code: string
}

export type BankDepositRouteErrorResult = {
  status: number
  body: BankDepositRouteErrorBody
}

function statusForPosSettlementCode(code: string): number {
  if (code === PosSettlementErrorCodes.COLLECTOR_REPORT_NOT_FOUND) return 404
  if (code === PosSettlementErrorCodes.FORBIDDEN_LEGAL_ENTITY) return 403
  if (
    code === PosSettlementErrorCodes.DUPLICATE_SOURCE ||
    code === PosSettlementErrorCodes.COLLECTOR_PICKUP_NOT_POSTED ||
    code === PosSettlementErrorCodes.PAY_IN_SLIP_REQUIRED
  ) {
    return 409
  }
  if (
    code === PosSettlementErrorCodes.INVALID_SOURCE ||
    code === PosSettlementErrorCodes.INVALID_AMOUNT
  ) {
    return 400
  }
  if (code === "PERIOD_CLOSED" || code === "PERIOD_NOT_OPENED") return 409
  return 500
}

export function mapBankDepositRouteError(
  err: unknown
): BankDepositRouteErrorResult | null {
  if (err instanceof PeriodAdminAuthError) {
    return {
      status: err.httpStatus,
      body: { error: err.message, code: err.code },
    }
  }

  if (err instanceof ReportError) {
    return {
      status: err.code === "UNAUTHORIZED" ? 401 : 400,
      body: { error: err.message, code: err.code },
    }
  }

  if (err instanceof PosSettlementError) {
    return {
      status: statusForPosSettlementCode(err.code),
      body: { error: err.message, code: err.code },
    }
  }

  if (err instanceof FinancePostingError) {
    return {
      status: statusForPosSettlementCode(err.code),
      body: { error: err.message, code: err.code },
    }
  }

  return null
}

export function bankDepositRouteErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Bank deposit settlement request failed"
}
