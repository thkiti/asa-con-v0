import type {
  CloseChecklistItem,
  CloseReadinessStatus,
} from "./close-checklist-types"

export type CloseGateErrorCode =
  | "CLOSE_BLOCKED"
  | "CLOSE_READINESS_FAILED"
  | "CLOSE_EVIDENCE_REQUIRED"
  | "CLOSE_SNAPSHOT_REQUIRED"

export type CloseGateBlocker = Pick<
  CloseChecklistItem,
  "id" | "group" | "severity" | "title" | "detail" | "refs"
>

export type CloseGateErrorPayload = {
  error: string
  code: CloseGateErrorCode
  readinessStatus: CloseReadinessStatus
  blockers: CloseGateBlocker[]
}

export class CloseGateError extends Error {
  readonly code: CloseGateErrorCode
  readonly readinessStatus: CloseReadinessStatus
  readonly blockers: CloseGateBlocker[]

  constructor(
    message: string,
    code: CloseGateErrorCode,
    readinessStatus: CloseReadinessStatus,
    blockers: CloseGateBlocker[]
  ) {
    super(message)
    this.name = "CloseGateError"
    this.code = code
    this.readinessStatus = readinessStatus
    this.blockers = blockers
  }
}

export function toCloseGateErrorPayload(err: CloseGateError): CloseGateErrorPayload {
  return {
    error: err.message,
    code: err.code,
    readinessStatus: err.readinessStatus,
    blockers: err.blockers,
  }
}
