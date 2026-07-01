import type {
  ManualJournalEntryType,
  Prisma,
} from "@/generated/prisma/client"
import { utcRangeForBangkokCalendarDay } from "@/lib/pos/bangkokDayBounds"
import { bangkokCalendarParts } from "@/lib/reporting/bangkok-calendar"
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

export const MANUAL_JOURNAL_ENTRY_ALLOCATION_MAX_ATTEMPTS = 5

export function documentCodeForEntryType(
  entryType: ManualJournalEntryType
): string {
  return ENTRY_TYPE_DOCUMENT_CODE[entryType]
}

/** Bangkok calendar year for entryDate — used for YY suffix and sequence scope. */
export function calendarYearFromEntryDate(entryDate: Date): number {
  return bangkokCalendarParts(entryDate).y
}

export function formatEntryYearSuffix(entryDate: Date): string {
  const year = calendarYearFromEntryDate(entryDate)
  return String(year).slice(-2).padStart(2, "0")
}

export function utcRangeForBangkokCalendarYear(year: number): {
  start: Date
  endExclusive: Date
} {
  const start = utcRangeForBangkokCalendarDay(`${year}-01-01`).start
  const endExclusive = utcRangeForBangkokCalendarDay(`${year + 1}-01-01`).start
  return { start, endExclusive }
}

/**
 * Builds `<CODE>-<YY><NNNN>` — legal entity is not part of the string.
 * @see docs/99_ASA_HANDBOOK.md Finance Vocabulary
 */
export function buildManualJournalEntryNo(
  entryType: ManualJournalEntryType,
  entryDate: Date,
  sequence: number
): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new ManualJournalEntryError(
      "Sequence must be a positive integer",
      ManualJournalEntryErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }

  const code = documentCodeForEntryType(entryType)
  const yy = formatEntryYearSuffix(entryDate)
  const nnnn = String(sequence).padStart(4, "0")
  return `${code}-${yy}${nnnn}`
}

function parseSequenceFromEntryNo(
  entryNo: string,
  prefix: string
): number | null {
  if (!entryNo.startsWith(prefix)) return null
  const suffix = entryNo.slice(prefix.length)
  if (!/^\d{4}$/.test(suffix)) return null
  const sequence = Number.parseInt(suffix, 10)
  return Number.isInteger(sequence) && sequence >= 1 ? sequence : null
}

export async function findMaxManualJournalEntrySequenceInScope(
  tx: Pick<Prisma.TransactionClient, "manualJournalEntry">,
  legalEntityCode: string,
  entryType: ManualJournalEntryType,
  entryDate: Date
): Promise<number> {
  const year = calendarYearFromEntryDate(entryDate)
  const { start, endExclusive } = utcRangeForBangkokCalendarYear(year)
  const prefix = `${documentCodeForEntryType(entryType)}-${formatEntryYearSuffix(entryDate)}`

  const existing = await tx.manualJournalEntry.findMany({
    where: {
      legalEntityCode,
      entryType,
      entryDate: { gte: start, lt: endExclusive },
      entryNo: { startsWith: prefix },
    },
    select: { entryNo: true },
  })

  let max = 0
  for (const row of existing) {
    const sequence = parseSequenceFromEntryNo(row.entryNo, prefix)
    if (sequence !== null && sequence > max) {
      max = sequence
    }
  }
  return max
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
  const legalEntityCode = input.legalEntityCode.trim()
  if (!legalEntityCode) {
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
