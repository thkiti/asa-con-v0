import type {
  ManualJournalEntryType,
  Prisma,
} from "@/generated/prisma/client"
import {
  assertLegalEntityCodeForDocumentAllocation,
  buildFinanceDocumentNumber,
  calendarYearFromDocumentDate,
  financeDocumentNumberPrefix,
  FINANCE_DOCUMENT_NUMBER_ALLOCATION_MAX_ATTEMPTS,
  formatDocumentYearSuffix,
  maxSequenceFromDocumentNumbers,
  parseSequenceFromDocumentNumber,
  utcRangeForBangkokCalendarYear,
  utcRangeForBangkokCalendarYearFromDocumentDate,
} from "@/lib/finance/document-number-allocation"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "./manual-journal-entry-errors"
import type { AllocateManualJournalEntryNoInput } from "./manual-journal-entry-types"

export const ENTRY_TYPE_DOCUMENT_CODE: Record<ManualJournalEntryType, string> = {
  MANUAL: "MJV",
  OPENING_BALANCE: "OPB",
  ADJUSTMENT: "ADJ",
  RECLASS: "REJ",
  ACCRUAL: "ACJ",
  AUDITOR_ADJUSTMENT: "AUJ",
}

export const MANUAL_JOURNAL_ENTRY_ALLOCATION_MAX_ATTEMPTS =
  FINANCE_DOCUMENT_NUMBER_ALLOCATION_MAX_ATTEMPTS

export function documentCodeForEntryType(
  entryType: ManualJournalEntryType
): string {
  return ENTRY_TYPE_DOCUMENT_CODE[entryType]
}

/** Bangkok calendar year for entryDate — used for YY suffix and sequence scope. */
export function calendarYearFromEntryDate(entryDate: Date): number {
  return calendarYearFromDocumentDate(entryDate)
}

export function formatEntryYearSuffix(entryDate: Date): string {
  return formatDocumentYearSuffix(entryDate)
}

export { utcRangeForBangkokCalendarYear }

/**
 * Builds `<CODE>-<YY><NNNN>` — legal entity is not part of the string.
 * @see docs/99_ASA_HANDBOOK.md Finance Vocabulary
 */
export function buildManualJournalEntryNo(
  entryType: ManualJournalEntryType,
  entryDate: Date,
  sequence: number
): string {
  try {
    return buildFinanceDocumentNumber(
      documentCodeForEntryType(entryType),
      entryDate,
      sequence
    )
  } catch {
    throw new ManualJournalEntryError(
      "Sequence must be a positive integer",
      ManualJournalEntryErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }
}

export async function findMaxManualJournalEntrySequenceInScope(
  tx: Pick<Prisma.TransactionClient, "manualJournalEntry">,
  legalEntityCode: string,
  entryType: ManualJournalEntryType,
  entryDate: Date
): Promise<number> {
  const { start, endExclusive } =
    utcRangeForBangkokCalendarYearFromDocumentDate(entryDate)
  const prefix = financeDocumentNumberPrefix(
    documentCodeForEntryType(entryType),
    entryDate
  )

  const existing = await tx.manualJournalEntry.findMany({
    where: {
      legalEntityCode,
      entryType,
      entryDate: { gte: start, lt: endExclusive },
      entryNo: { startsWith: prefix },
    },
    select: { entryNo: true },
  })

  return maxSequenceFromDocumentNumbers(
    existing.map((row) => row.entryNo),
    prefix
  )
}

export async function countManualJournalEntriesInScope(
  tx: Pick<Prisma.TransactionClient, "manualJournalEntry">,
  legalEntityCode: string,
  entryType: ManualJournalEntryType,
  entryDate: Date
): Promise<number> {
  const year = calendarYearFromEntryDate(entryDate)
  const { start, endExclusive } = utcRangeForBangkokCalendarYear(year)

  return tx.manualJournalEntry.count({
    where: {
      legalEntityCode,
      entryType,
      entryDate: { gte: start, lt: endExclusive },
    },
  })
}

/**
 * Allocates the next `<CODE>-<YY><NNNN>` for legalEntityCode + entryType + calendar year.
 * Composite unique on (legalEntityCode, entryNo) is the concurrency safety net.
 */
export async function allocateManualJournalEntryNo(
  tx: Pick<Prisma.TransactionClient, "manualJournalEntry">,
  input: AllocateManualJournalEntryNoInput
): Promise<string> {
  let legalEntityCode: string
  try {
    legalEntityCode = assertLegalEntityCodeForDocumentAllocation(
      input.legalEntityCode
    )
  } catch {
    throw new ManualJournalEntryError(
      "legalEntityCode is required for entry number allocation",
      ManualJournalEntryErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }

  try {
    const maxSequence = await findMaxManualJournalEntrySequenceInScope(
      tx,
      legalEntityCode,
      input.entryType,
      input.entryDate
    )
    return buildManualJournalEntryNo(
      input.entryType,
      input.entryDate,
      maxSequence + 1
    )
  } catch (err) {
    if (err instanceof ManualJournalEntryError) {
      throw err
    }
    throw new ManualJournalEntryError(
      "Failed to allocate manual journal entry number",
      ManualJournalEntryErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }
}

export { parseSequenceFromDocumentNumber }
