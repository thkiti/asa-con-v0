import type { Prisma } from "@/generated/prisma/client"
import { utcRangeForBangkokCalendarDay } from "@/lib/pos/bangkokDayBounds"
import { bangkokCalendarParts } from "@/lib/reporting/bangkok-calendar"
import {
  PettyCashVoucherError,
  PettyCashVoucherErrorCodes,
} from "./petty-cash-voucher-errors"
import type { AllocatePettyCashVoucherNoInput } from "./petty-cash-voucher-types"

export const PETTY_CASH_VOUCHER_DOCUMENT_CODE = "PCV"

export function formatPettyCashVoucherYearSuffix(entryDate: Date): string {
  const year = bangkokCalendarParts(entryDate).y
  return String(year).slice(-2).padStart(2, "0")
}

function utcRangeForBangkokCalendarYear(year: number): {
  start: Date
  endExclusive: Date
} {
  const start = utcRangeForBangkokCalendarDay(`${year}-01-01`).start
  const endExclusive = utcRangeForBangkokCalendarDay(`${year + 1}-01-01`).start
  return { start, endExclusive }
}

export function buildPettyCashVoucherNo(entryDate: Date, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new PettyCashVoucherError(
      "Sequence must be a positive integer",
      PettyCashVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }

  const yy = formatPettyCashVoucherYearSuffix(entryDate)
  const nnnn = String(sequence).padStart(4, "0")
  return `${PETTY_CASH_VOUCHER_DOCUMENT_CODE}-${yy}${nnnn}`
}

export async function countPettyCashVouchersInScope(
  tx: Pick<Prisma.TransactionClient, "pettyCashVoucher">,
  legalEntityCode: string,
  entryDate: Date
): Promise<number> {
  const year = bangkokCalendarParts(entryDate).y
  const { start, endExclusive } = utcRangeForBangkokCalendarYear(year)

  return tx.pettyCashVoucher.count({
    where: {
      legalEntityCode,
      entryDate: { gte: start, lt: endExclusive },
    },
  })
}

export async function allocatePettyCashVoucherNo(
  tx: Pick<Prisma.TransactionClient, "pettyCashVoucher">,
  input: AllocatePettyCashVoucherNoInput
): Promise<string> {
  const legalEntityCode = input.legalEntityCode.trim()
  if (!legalEntityCode) {
    throw new PettyCashVoucherError(
      "legalEntityCode is required for entry number allocation",
      PettyCashVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }

  try {
    const count = await countPettyCashVouchersInScope(
      tx,
      legalEntityCode,
      input.entryDate
    )
    return buildPettyCashVoucherNo(input.entryDate, count + 1)
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
