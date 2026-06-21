import {
  PaymentVoucherError,
  PaymentVoucherPolicyError,
} from "./payment-voucher-errors"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { PeriodAdminAuthError } from "@/lib/auth"

export type PaymentVoucherRouteErrorBody = {
  error: string
  code: string
}

export type PaymentVoucherRouteErrorResult = {
  status: number
  body: PaymentVoucherRouteErrorBody
}

function statusForPaymentVoucherCode(code: string): number {
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
    code === "INVALID_PAY_FROM_ACCOUNT" ||
    code === "EMPTY_ALLOCATION" ||
    code === "INVALID_AMOUNT" ||
    code === "UNBALANCED_VOUCHER" ||
    code === "VALIDATION_ERROR"
  ) {
    return 400
  }
  return 500
}

export function mapPaymentVoucherRouteError(
  err: unknown
): PaymentVoucherRouteErrorResult | null {
  if (err instanceof PeriodAdminAuthError) {
    return {
      status: err.httpStatus,
      body: { error: err.message, code: err.code },
    }
  }

  if (err instanceof PaymentVoucherError) {
    return {
      status: statusForPaymentVoucherCode(err.code),
      body: { error: err.message, code: err.code },
    }
  }

  if (err instanceof PaymentVoucherPolicyError) {
    return {
      status: statusForPaymentVoucherCode(err.code),
      body: { error: err.message, code: err.code },
    }
  }

  if (err instanceof FinancePostingError) {
    return {
      status: statusForPaymentVoucherCode(err.code),
      body: { error: err.message, code: err.code },
    }
  }

  return null
}

export function paymentVoucherRouteErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Payment voucher request failed"
}
