import {
  RevenueVoucherError,
  RevenueVoucherPolicyError,
} from "./revenue-voucher-errors"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { PeriodAdminAuthError } from "@/lib/auth"

export type RevenueVoucherRouteErrorBody = {
  error: string
  code: string
}

export type RevenueVoucherRouteErrorResult = {
  status: number
  body: RevenueVoucherRouteErrorBody
}

function statusForRevenueVoucherCode(code: string): number {
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
    code === "INVALID_RECEIVE_TO_ACCOUNT" ||
    code === "EMPTY_ALLOCATION" ||
    code === "INVALID_AMOUNT" ||
    code === "UNBALANCED_VOUCHER" ||
    code === "VALIDATION_ERROR"
  ) {
    return 400
  }
  return 500
}

export function mapRevenueVoucherRouteError(
  err: unknown
): RevenueVoucherRouteErrorResult | null {
  if (err instanceof PeriodAdminAuthError) {
    return {
      status: err.httpStatus,
      body: { error: err.message, code: err.code },
    }
  }

  if (err instanceof RevenueVoucherError) {
    return {
      status: statusForRevenueVoucherCode(err.code),
      body: { error: err.message, code: err.code },
    }
  }

  if (err instanceof RevenueVoucherPolicyError) {
    return {
      status: statusForRevenueVoucherCode(err.code),
      body: { error: err.message, code: err.code },
    }
  }

  if (err instanceof FinancePostingError) {
    return {
      status: statusForRevenueVoucherCode(err.code),
      body: { error: err.message, code: err.code },
    }
  }

  return null
}

export function revenueVoucherRouteErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Revenue voucher request failed"
}
