import {
  PettyCashVoucherError,
  PettyCashVoucherPolicyError,
} from "./petty-cash-voucher-errors"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { PeriodAdminAuthError } from "@/lib/auth"

export type PettyCashVoucherRouteErrorBody = {
  error: string
  code: string
}

export type PettyCashVoucherRouteErrorResult = {
  status: number
  body: PettyCashVoucherRouteErrorBody
}

function statusForPettyCashVoucherCode(code: string): number {
  if (code === "ENTRY_NOT_FOUND") return 404
  if (
    code === "INVALID_TRANSITION" ||
    code === "IMMUTABLE_ENTRY" ||
    code === "NOT_DRAFT" ||
    code === "PERIOD_CLOSED" ||
    code === "PERIOD_NOT_OPENED"
  ) {
    return 409
  }
  if (
    code === "INVALID_LINE" ||
    code === "ACCOUNT_NOT_FOUND" ||
    code === "ACCOUNT_INACTIVE" ||
    code === "INVALID_PETTY_CASH_ACCOUNT" ||
    code === "EMPTY_ALLOCATION" ||
    code === "INVALID_AMOUNT" ||
    code === "UNBALANCED_VOUCHER" ||
    code === "VALIDATION_ERROR"
  ) {
    return 400
  }
  return 500
}

export function mapPettyCashVoucherRouteError(
  err: unknown
): PettyCashVoucherRouteErrorResult | null {
  if (err instanceof PeriodAdminAuthError) {
    return {
      status: err.httpStatus,
      body: { error: err.message, code: err.code },
    }
  }

  if (err instanceof PettyCashVoucherError) {
    return {
      status: statusForPettyCashVoucherCode(err.code),
      body: { error: err.message, code: err.code },
    }
  }

  if (err instanceof PettyCashVoucherPolicyError) {
    return {
      status: statusForPettyCashVoucherCode(err.code),
      body: { error: err.message, code: err.code },
    }
  }

  if (err instanceof FinancePostingError) {
    return {
      status: statusForPettyCashVoucherCode(err.code),
      body: { error: err.message, code: err.code },
    }
  }

  return null
}

export function pettyCashVoucherRouteErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Petty cash voucher request failed"
}
