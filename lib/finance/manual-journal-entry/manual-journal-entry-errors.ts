import { formatEntityShort } from "@/lib/legal-entity/display"

export const ManualJournalEntryErrorCodes = {
  INVALID_TRANSITION: "INVALID_TRANSITION",
  IMMUTABLE_ENTRY: "IMMUTABLE_ENTRY",
  ENTRY_NOT_FOUND: "ENTRY_NOT_FOUND",
  DOCUMENT_NUMBER_ALLOCATION_FAILED: "DOCUMENT_NUMBER_ALLOCATION_FAILED",
  NOT_DRAFT: "NOT_DRAFT",
  INVALID_LINE: "INVALID_LINE",
  ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
  ACCOUNT_INACTIVE: "ACCOUNT_INACTIVE",
  INSUFFICIENT_LINES: "INSUFFICIENT_LINES",
  UNBALANCED_ENTRY: "UNBALANCED_ENTRY",
  OPB_PL_ACCOUNT_NOT_ALLOWED: "OPB_PL_ACCOUNT_NOT_ALLOWED",
  OPB_DUPLICATE_POSTED: "OPB_DUPLICATE_POSTED",
  PDF_MISSING: "PDF_MISSING",
  PDF_METADATA_INCOMPLETE: "PDF_METADATA_INCOMPLETE",
  PDF_FONT_MISSING: "PDF_FONT_MISSING",
} as const

export type ManualJournalEntryErrorCode =
  (typeof ManualJournalEntryErrorCodes)[keyof typeof ManualJournalEntryErrorCodes]

export class ManualJournalEntryError extends Error {
  readonly code: ManualJournalEntryErrorCode
  readonly httpStatus: number

  constructor(
    message: string,
    code: ManualJournalEntryErrorCode,
    httpStatus = 400
  ) {
    super(message)
    this.name = "ManualJournalEntryError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

/** User-facing message when draft entryNo allocation fails after retries. */
export function formatManualJournalEntryAllocationFailedMessage(
  legalEntityCode: string
): string {
  const label = formatEntityShort(legalEntityCode)
  return `Could not allocate a new manual journal number for ${label}. Please retry. If the problem continues, contact admin.`
}

export class ManualJournalEntryPolicyError extends ManualJournalEntryError {
  constructor(
    message: string,
    code: ManualJournalEntryErrorCode = ManualJournalEntryErrorCodes.INVALID_TRANSITION
  ) {
    super(message, code, 400)
    this.name = "ManualJournalEntryPolicyError"
  }
}
