import type { Prisma } from "@/generated/prisma/client"
import {
  assertLegalEntityCodeForDocumentAllocation,
  buildFinanceDocumentNumber,
  financeDocumentNumberPrefix,
  formatDocumentYearSuffix,
  maxSequenceFromDocumentNumbers,
  utcRangeForBangkokCalendarYearFromDocumentDate,
} from "@/lib/finance/document-number-allocation"
import {
  RevenueVoucherError,
  RevenueVoucherErrorCodes,
} from "./revenue-voucher-errors"
import type { AllocateRevenueVoucherNoInput } from "./revenue-voucher-types"

export const REVENUE_VOUCHER_DOCUMENT_CODE = "REV"

export function formatRevenueVoucherYearSuffix(entryDate: Date): string {
  return formatDocumentYearSuffix(entryDate)
}

export function buildRevenueVoucherNo(entryDate: Date, sequence: number): string {
  try {
    return buildFinanceDocumentNumber(
      REVENUE_VOUCHER_DOCUMENT_CODE,
      entryDate,
      sequence
    )
  } catch {
    throw new RevenueVoucherError(
      "Sequence must be a positive integer",
      RevenueVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }
}

export async function findMaxRevenueVoucherSequenceInScope(
  tx: Pick<Prisma.TransactionClient, "revenueVoucher">,
  legalEntityCode: string,
  entryDate: Date
): Promise<number> {
  const { start, endExclusive } =
    utcRangeForBangkokCalendarYearFromDocumentDate(entryDate)
  const prefix = financeDocumentNumberPrefix(
    REVENUE_VOUCHER_DOCUMENT_CODE,
    entryDate
  )

  const existing = await tx.revenueVoucher.findMany({
    where: {
      legalEntityCode,
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

export async function allocateRevenueVoucherNo(
  tx: Pick<Prisma.TransactionClient, "revenueVoucher">,
  input: AllocateRevenueVoucherNoInput
): Promise<string> {
  let legalEntityCode: string
  try {
    legalEntityCode = assertLegalEntityCodeForDocumentAllocation(
      input.legalEntityCode
    )
  } catch {
    throw new RevenueVoucherError(
      "legalEntityCode is required for entry number allocation",
      RevenueVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }

  try {
    const maxSequence = await findMaxRevenueVoucherSequenceInScope(
      tx,
      legalEntityCode,
      input.entryDate
    )
    return buildRevenueVoucherNo(input.entryDate, maxSequence + 1)
  } catch (err) {
    if (err instanceof RevenueVoucherError) {
      throw err
    }
    throw new RevenueVoucherError(
      "Failed to allocate Revenue voucher number",
      RevenueVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }
}
