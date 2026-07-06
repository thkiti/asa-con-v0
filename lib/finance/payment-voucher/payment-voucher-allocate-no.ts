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
  PaymentVoucherError,
  PaymentVoucherErrorCodes,
} from "./payment-voucher-errors"
import type { AllocatePaymentVoucherNoInput } from "./payment-voucher-types"

export const PAYMENT_VOUCHER_DOCUMENT_CODE = "PAV"

export function formatPaymentVoucherYearSuffix(entryDate: Date): string {
  return formatDocumentYearSuffix(entryDate)
}

export function buildPaymentVoucherNo(entryDate: Date, sequence: number): string {
  try {
    return buildFinanceDocumentNumber(
      PAYMENT_VOUCHER_DOCUMENT_CODE,
      entryDate,
      sequence
    )
  } catch {
    throw new PaymentVoucherError(
      "Sequence must be a positive integer",
      PaymentVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }
}

export async function findMaxPaymentVoucherSequenceInScope(
  tx: Pick<Prisma.TransactionClient, "paymentVoucher">,
  legalEntityCode: string,
  entryDate: Date
): Promise<number> {
  const { start, endExclusive } =
    utcRangeForBangkokCalendarYearFromDocumentDate(entryDate)
  const prefix = financeDocumentNumberPrefix(
    PAYMENT_VOUCHER_DOCUMENT_CODE,
    entryDate
  )

  const existing = await tx.paymentVoucher.findMany({
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

/**
 * Allocates the next PAV-YYnnnn for legalEntityCode + calendar year.
 * Composite unique on (legalEntityCode, entryNo) is the concurrency safety net.
 */
export async function allocatePaymentVoucherNo(
  tx: Pick<Prisma.TransactionClient, "paymentVoucher">,
  input: AllocatePaymentVoucherNoInput
): Promise<string> {
  let legalEntityCode: string
  try {
    legalEntityCode = assertLegalEntityCodeForDocumentAllocation(
      input.legalEntityCode
    )
  } catch {
    throw new PaymentVoucherError(
      "legalEntityCode is required for entry number allocation",
      PaymentVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }

  try {
    const maxSequence = await findMaxPaymentVoucherSequenceInScope(
      tx,
      legalEntityCode,
      input.entryDate
    )
    return buildPaymentVoucherNo(input.entryDate, maxSequence + 1)
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
