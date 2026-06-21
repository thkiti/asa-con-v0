import type { Prisma } from "@/generated/prisma/client"
import { utcRangeForBangkokCalendarDay } from "@/lib/pos/bangkokDayBounds"
import { bangkokCalendarParts } from "@/lib/reporting/bangkok-calendar"
import {
  PaymentVoucherError,
  PaymentVoucherErrorCodes,
} from "./payment-voucher-errors"
import type { AllocatePaymentVoucherNoInput } from "./payment-voucher-types"

export const PAYMENT_VOUCHER_DOCUMENT_CODE = "PAV"

export function formatPaymentVoucherYearSuffix(entryDate: Date): string {
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

export function buildPaymentVoucherNo(entryDate: Date, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new PaymentVoucherError(
      "Sequence must be a positive integer",
      PaymentVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }

  const yy = formatPaymentVoucherYearSuffix(entryDate)
  const nnnn = String(sequence).padStart(4, "0")
  return `${PAYMENT_VOUCHER_DOCUMENT_CODE}-${yy}${nnnn}`
}

export async function countPaymentVouchersInScope(
  tx: Pick<Prisma.TransactionClient, "paymentVoucher">,
  legalEntityCode: string,
  entryDate: Date
): Promise<number> {
  const year = bangkokCalendarParts(entryDate).y
  const { start, endExclusive } = utcRangeForBangkokCalendarYear(year)

  return tx.paymentVoucher.count({
    where: {
      legalEntityCode,
      entryDate: { gte: start, lt: endExclusive },
    },
  })
}

export async function allocatePaymentVoucherNo(
  tx: Pick<Prisma.TransactionClient, "paymentVoucher">,
  input: AllocatePaymentVoucherNoInput
): Promise<string> {
  const legalEntityCode = input.legalEntityCode.trim()
  if (!legalEntityCode) {
    throw new PaymentVoucherError(
      "legalEntityCode is required for entry number allocation",
      PaymentVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }

  try {
    const count = await countPaymentVouchersInScope(
      tx,
      legalEntityCode,
      input.entryDate
    )
    return buildPaymentVoucherNo(input.entryDate, count + 1)
  } catch (err) {
    if (err instanceof PaymentVoucherError) {
      throw err
    }
    throw new PaymentVoucherError(
      "Failed to allocate payment voucher number",
      PaymentVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }
}
