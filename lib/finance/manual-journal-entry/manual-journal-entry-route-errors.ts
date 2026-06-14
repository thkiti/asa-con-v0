import {
  ManualJournalEntryError,
  ManualJournalEntryPolicyError,
} from "./manual-journal-entry-errors"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { PeriodAdminAuthError } from "@/lib/auth"

export type ManualJournalEntryRouteErrorBody = {
  error: string
  code: string
}

export type ManualJournalEntryRouteErrorResult = {
  status: number
  body: ManualJournalEntryRouteErrorBody
}

function statusForManualJournalEntryCode(code: string): number {
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
    code === "INSUFFICIENT_LINES" ||
    code === "UNBALANCED_ENTRY" ||
    code === "INVALID_LINE" ||
    code === "ACCOUNT_NOT_FOUND" ||
    code === "ACCOUNT_INACTIVE" ||
    code === "OPB_PL_ACCOUNT_NOT_ALLOWED" ||
    code === "VALIDATION_ERROR"
  ) {
    return 400
  }
  if (code === "OPB_DUPLICATE_POSTED") {
    return 409
  }
  return 500
}

export function mapManualJournalEntryRouteError(
  err: unknown
): ManualJournalEntryRouteErrorResult | null {
  if (err instanceof PeriodAdminAuthError) {
    return {
      status: err.httpStatus,
      body: { error: err.message, code: err.code },
    }
  }

  if (err instanceof ManualJournalEntryError) {
    return {
      status: statusForManualJournalEntryCode(err.code),
      body: { error: err.message, code: err.code },
    }
  }

  if (err instanceof ManualJournalEntryPolicyError) {
    return {
      status: statusForManualJournalEntryCode(err.code),
      body: { error: err.message, code: err.code },
    }
  }

  if (err instanceof FinancePostingError) {
    return {
      status: statusForManualJournalEntryCode(err.code),
      body: { error: err.message, code: err.code },
    }
  }

  return null
}

export function manualJournalEntryRouteErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Manual journal entry request failed"
}
