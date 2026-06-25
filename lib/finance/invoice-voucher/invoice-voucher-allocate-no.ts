import type { Prisma } from "@/generated/prisma/client"
import { utcRangeForBangkokCalendarDay } from "@/lib/pos/bangkokDayBounds"
import { bangkokCalendarParts } from "@/lib/reporting/bangkok-calendar"
import {
  InvoiceVoucherError,
  InvoiceVoucherErrorCodes,
} from "./invoice-voucher-errors"
import type { AllocateInvoiceVoucherNoInput } from "./invoice-voucher-types"

export const INVOICE_VOUCHER_DOCUMENT_CODE = "INV"

export function formatInvoiceVoucherYearSuffix(invoiceDate: Date): string {
  const year = bangkokCalendarParts(invoiceDate).y
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

export function buildInvoiceVoucherNo(invoiceDate: Date, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new InvoiceVoucherError(
      "Sequence must be a positive integer",
      InvoiceVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }

  const yy = formatInvoiceVoucherYearSuffix(invoiceDate)
  const nnnn = String(sequence).padStart(4, "0")
  return `${INVOICE_VOUCHER_DOCUMENT_CODE}-${yy}${nnnn}`
}

export async function countInvoiceVouchersInScope(
  tx: Pick<Prisma.TransactionClient, "invoiceVoucher">,
  legalEntityCode: string,
  invoiceDate: Date
): Promise<number> {
  const year = bangkokCalendarParts(invoiceDate).y
  const { start, endExclusive } = utcRangeForBangkokCalendarYear(year)

  return tx.invoiceVoucher.count({
    where: {
      legalEntityCode,
      invoiceDate: { gte: start, lt: endExclusive },
    },
  })
}

export async function allocateInvoiceVoucherNo(
  tx: Pick<Prisma.TransactionClient, "invoiceVoucher">,
  input: AllocateInvoiceVoucherNoInput
): Promise<string> {
  const legalEntityCode = input.legalEntityCode.trim()
  if (!legalEntityCode) {
    throw new InvoiceVoucherError(
      "legalEntityCode is required for entry number allocation",
      InvoiceVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }

  try {
    const count = await countInvoiceVouchersInScope(
      tx,
      legalEntityCode,
      input.invoiceDate
    )
    return buildInvoiceVoucherNo(input.invoiceDate, count + 1)
  } catch (err) {
    if (err instanceof InvoiceVoucherError) {
      throw err
    }
    throw new InvoiceVoucherError(
      "Failed to allocate Invoice voucher number",
      InvoiceVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }
}
