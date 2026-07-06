import { Prisma as PrismaNamespace } from "@/generated/prisma/client"
import { utcRangeForBangkokCalendarDay } from "@/lib/pos/bangkokDayBounds"
import { bangkokCalendarParts } from "@/lib/reporting/bangkok-calendar"
import { formatEntityShort } from "@/lib/legal-entity/display"

/** Retry budget when composite (legalEntityCode, entryNo) unique races on create. */
export const FINANCE_DOCUMENT_NUMBER_ALLOCATION_MAX_ATTEMPTS = 5

/** Bangkok calendar year for document dates — used for YY suffix and sequence scope. */
export function calendarYearFromDocumentDate(documentDate: Date): number {
  return bangkokCalendarParts(documentDate).y
}

export function formatDocumentYearSuffix(documentDate: Date): string {
  const year = calendarYearFromDocumentDate(documentDate)
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

export function utcRangeForBangkokCalendarYearFromDocumentDate(
  documentDate: Date
): { start: Date; endExclusive: Date } {
  return utcRangeForBangkokCalendarYear(calendarYearFromDocumentDate(documentDate))
}

/**
 * Builds `<CODE>-<YY><NNNN>` — legal entity is not part of the string.
 * Uniqueness is enforced per legalEntityCode in the database.
 */
export function buildFinanceDocumentNumber(
  documentCode: string,
  documentDate: Date,
  sequence: number
): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("Sequence must be a positive integer")
  }

  const yy = formatDocumentYearSuffix(documentDate)
  const nnnn = String(sequence).padStart(4, "0")
  return `${documentCode}-${yy}${nnnn}`
}

export function financeDocumentNumberPrefix(
  documentCode: string,
  documentDate: Date
): string {
  return `${documentCode}-${formatDocumentYearSuffix(documentDate)}`
}

export function parseSequenceFromDocumentNumber(
  entryNo: string,
  prefix: string
): number | null {
  if (!entryNo.startsWith(prefix)) return null
  const suffix = entryNo.slice(prefix.length)
  if (!/^\d{4}$/.test(suffix)) return null
  const sequence = Number.parseInt(suffix, 10)
  return Number.isInteger(sequence) && sequence >= 1 ? sequence : null
}

export function maxSequenceFromDocumentNumbers(
  entryNos: string[],
  prefix: string
): number {
  let max = 0
  for (const entryNo of entryNos) {
    const sequence = parseSequenceFromDocumentNumber(entryNo, prefix)
    if (sequence !== null && sequence > max) {
      max = sequence
    }
  }
  return max
}

export function assertLegalEntityCodeForDocumentAllocation(
  legalEntityCode: string
): string {
  const trimmed = legalEntityCode.trim()
  if (!trimmed) {
    throw new Error("legalEntityCode is required for document number allocation")
  }
  return trimmed
}

export function isPrismaUniqueConstraintError(err: unknown): boolean {
  return (
    err instanceof PrismaNamespace.PrismaClientKnownRequestError &&
    err.code === "P2002"
  )
}

export async function createWithAllocatedEntryNoRetry<T>(input: {
  maxAttempts?: number
  allocate: () => Promise<string>
  create: (entryNo: string) => Promise<T>
  allocationFailedError: () => Error
}): Promise<T> {
  const maxAttempts =
    input.maxAttempts ?? FINANCE_DOCUMENT_NUMBER_ALLOCATION_MAX_ATTEMPTS

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const entryNo = await input.allocate()
    try {
      return await input.create(entryNo)
    } catch (err) {
      if (isPrismaUniqueConstraintError(err) && attempt + 1 < maxAttempts) {
        continue
      }
      if (isPrismaUniqueConstraintError(err)) {
        throw input.allocationFailedError()
      }
      throw err
    }
  }

  throw input.allocationFailedError()
}

export function formatFinanceDocumentAllocationFailedMessage(
  legalEntityCode: string,
  documentLabel: string
): string {
  const label = formatEntityShort(legalEntityCode)
  return `Could not allocate a new ${documentLabel} number for ${label}. Please retry. If the problem continues, contact admin.`
}
