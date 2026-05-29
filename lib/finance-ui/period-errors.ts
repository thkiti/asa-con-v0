import type { CloseGateBlocker } from "@/lib/finance/close-gate-errors"
import type { CloseReadinessStatus } from "@/lib/finance/close-checklist-types"

export type PeriodFetchErrorBody = {
  error?: string
  message?: string
  code?: string
  readinessStatus?: CloseReadinessStatus
  blockers?: CloseGateBlocker[]
}

export type PeriodActionError = Error & {
  code?: string
  readinessStatus?: CloseReadinessStatus
  blockers?: CloseGateBlocker[]
}

export function isPeriodActionError(err: unknown): err is PeriodActionError {
  return err instanceof Error
}

export function getPeriodActionErrorDetails(err: unknown): {
  message: string
  code?: string
  readinessStatus?: CloseReadinessStatus
  blockers?: CloseGateBlocker[]
} {
  if (!isPeriodActionError(err)) {
    return { message: "Request failed" }
  }

  return {
    message: err.message,
    code: err.code,
    readinessStatus: err.readinessStatus,
    blockers: err.blockers,
  }
}
