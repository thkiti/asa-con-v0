import {
  InvoiceVoucherError,
  InvoiceVoucherPolicyError,
} from "./invoice-voucher-errors"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { PeriodAdminAuthError } from "@/lib/auth"
import { ReportError } from "@/lib/reporting/report-errors"

export type InvoiceVoucherRouteErrorBody = {
  error: string
  code: string
}

export type InvoiceVoucherRouteErrorResult = {
  status: number
  body: InvoiceVoucherRouteErrorBody
}

function statusForInvoiceVoucherCode(code: string): number {
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
    code === "EMPTY_ALLOCATION" ||
    code === "INVALID_AMOUNT" ||
    code === "UNBALANCED_VOUCHER" ||
    code === "VALIDATION_ERROR"
  ) {
    return 400
  }
  return 500
}

export function mapInvoiceVoucherRouteError(
  err: unknown
): InvoiceVoucherRouteErrorResult | null {
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

  if (err instanceof InvoiceVoucherError) {
    return {
      status: statusForInvoiceVoucherCode(err.code),
      body: { error: err.message, code: err.code },
    }
  }

  if (err instanceof InvoiceVoucherPolicyError) {
    return {
      status: statusForInvoiceVoucherCode(err.code),
      body: { error: err.message, code: err.code },
    }
  }

  if (err instanceof FinancePostingError) {
    return {
      status: statusForInvoiceVoucherCode(err.code),
      body: { error: err.message, code: err.code },
    }
  }

  return null
}

export function invoiceVoucherRouteErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Invoice voucher request failed"
}
