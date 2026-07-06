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
  InvoiceVoucherError,
  InvoiceVoucherErrorCodes,
} from "./invoice-voucher-errors"
import type { AllocateInvoiceVoucherNoInput } from "./invoice-voucher-types"

export const INVOICE_VOUCHER_DOCUMENT_CODE = "INV"

export function formatInvoiceVoucherYearSuffix(invoiceDate: Date): string {
  return formatDocumentYearSuffix(invoiceDate)
}

export function buildInvoiceVoucherNo(invoiceDate: Date, sequence: number): string {
  try {
    return buildFinanceDocumentNumber(
      INVOICE_VOUCHER_DOCUMENT_CODE,
      invoiceDate,
      sequence
    )
  } catch {
    throw new InvoiceVoucherError(
      "Sequence must be a positive integer",
      InvoiceVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }
}

export async function findMaxInvoiceVoucherSequenceInScope(
  tx: Pick<Prisma.TransactionClient, "invoiceVoucher">,
  legalEntityCode: string,
  invoiceDate: Date
): Promise<number> {
  const { start, endExclusive } =
    utcRangeForBangkokCalendarYearFromDocumentDate(invoiceDate)
  const prefix = financeDocumentNumberPrefix(
    INVOICE_VOUCHER_DOCUMENT_CODE,
    invoiceDate
  )

  const existing = await tx.invoiceVoucher.findMany({
    where: {
      legalEntityCode,
      invoiceDate: { gte: start, lt: endExclusive },
      entryNo: { startsWith: prefix },
    },
    select: { entryNo: true },
  })

  return maxSequenceFromDocumentNumbers(
    existing.map((row) => row.entryNo),
    prefix
  )
}

export async function allocateInvoiceVoucherNo(
  tx: Pick<Prisma.TransactionClient, "invoiceVoucher">,
  input: AllocateInvoiceVoucherNoInput
): Promise<string> {
  let legalEntityCode: string
  try {
    legalEntityCode = assertLegalEntityCodeForDocumentAllocation(
      input.legalEntityCode
    )
  } catch {
    throw new InvoiceVoucherError(
      "legalEntityCode is required for entry number allocation",
      InvoiceVoucherErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
    )
  }

  try {
    const maxSequence = await findMaxInvoiceVoucherSequenceInScope(
      tx,
      legalEntityCode,
      input.invoiceDate
    )
    return buildInvoiceVoucherNo(input.invoiceDate, maxSequence + 1)
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
