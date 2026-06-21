import type { Prisma } from "@/generated/prisma/client"
import { utcRangeForBangkokCalendarDay } from "@/lib/pos/bangkokDayBounds"
import { bangkokCalendarParts } from "@/lib/reporting/bangkok-calendar"
import {
  RevenueVoucherError,
  RevenueVoucherErrorCodes,
} from "./revenue-voucher-errors"
import type { AllocateRevenueVoucherNoInput } from "./revenue-voucher-types"

export const REVENUE_VOUCHER_DOCUMENT_CODE = "REV"

export function formatRevenueVoucherYearSuffix(entryDate: Date): string {
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

export function buildRevenueVoucherNo(entryDate: Date, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RevenueVoucherError(
      "Sequence must be a positive integer",
      RevenueVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }

  const yy = formatRevenueVoucherYearSuffix(entryDate)
  const nnnn = String(sequence).padStart(4, "0")
  return `${REVENUE_VOUCHER_DOCUMENT_CODE}-${yy}${nnnn}`
}

export async function countRevenueVouchersInScope(
  tx: Pick<Prisma.TransactionClient, "revenueVoucher">,
  legalEntityCode: string,
  entryDate: Date
): Promise<number> {
  const year = bangkokCalendarParts(entryDate).y
  const { start, endExclusive } = utcRangeForBangkokCalendarYear(year)

  return tx.revenueVoucher.count({
    where: {
      legalEntityCode,
      entryDate: { gte: start, lt: endExclusive },
    },
  })
}

export async function allocateRevenueVoucherNo(
  tx: Pick<Prisma.TransactionClient, "revenueVoucher">,
  input: AllocateRevenueVoucherNoInput
): Promise<string> {
  const legalEntityCode = input.legalEntityCode.trim()
  if (!legalEntityCode) {
    throw new RevenueVoucherError(
      "legalEntityCode is required for entry number allocation",
      RevenueVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }

  try {
    const count = await countRevenueVouchersInScope(
      tx,
      legalEntityCode,
      input.entryDate
    )
    return buildRevenueVoucherNo(input.entryDate, count + 1)
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
