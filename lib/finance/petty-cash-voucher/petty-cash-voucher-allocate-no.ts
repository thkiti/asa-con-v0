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
  PettyCashVoucherError,
  PettyCashVoucherErrorCodes,
} from "./petty-cash-voucher-errors"
import type { AllocatePettyCashVoucherNoInput } from "./petty-cash-voucher-types"

export const PETTY_CASH_VOUCHER_DOCUMENT_CODE = "PCV"

export function formatPettyCashVoucherYearSuffix(entryDate: Date): string {
  return formatDocumentYearSuffix(entryDate)
}

export function buildPettyCashVoucherNo(entryDate: Date, sequence: number): string {
  try {
    return buildFinanceDocumentNumber(
      PETTY_CASH_VOUCHER_DOCUMENT_CODE,
      entryDate,
      sequence
    )
  } catch {
    throw new PettyCashVoucherError(
      "Sequence must be a positive integer",
      PettyCashVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }
}

export async function findMaxPettyCashVoucherSequenceInScope(
  tx: Pick<Prisma.TransactionClient, "pettyCashVoucher">,
  legalEntityCode: string,
  entryDate: Date
): Promise<number> {
  const { start, endExclusive } =
    utcRangeForBangkokCalendarYearFromDocumentDate(entryDate)
  const prefix = financeDocumentNumberPrefix(
    PETTY_CASH_VOUCHER_DOCUMENT_CODE,
    entryDate
  )

  const existing = await tx.pettyCashVoucher.findMany({
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

export async function allocatePettyCashVoucherNo(
  tx: Pick<Prisma.TransactionClient, "pettyCashVoucher">,
  input: AllocatePettyCashVoucherNoInput
): Promise<string> {
  let legalEntityCode: string
  try {
    legalEntityCode = assertLegalEntityCodeForDocumentAllocation(
      input.legalEntityCode
    )
  } catch {
    throw new PettyCashVoucherError(
      "legalEntityCode is required for entry number allocation",
      PettyCashVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }

  try {
    const maxSequence = await findMaxPettyCashVoucherSequenceInScope(
      tx,
      legalEntityCode,
      input.entryDate
    )
    return buildPettyCashVoucherNo(input.entryDate, maxSequence + 1)
  } catch (err) {
    if (err instanceof PettyCashVoucherError) {
      throw err
    }
    throw new PettyCashVoucherError(
      "Failed to allocate Petty cash voucher number",
      PettyCashVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }
}
