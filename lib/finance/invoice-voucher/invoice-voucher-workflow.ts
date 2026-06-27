import type { Prisma } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { entityScopedIdWhere } from "@/lib/finance/voucher-entity-scope"
import { prisma } from "@/lib/shared/prisma"
import {
  InvoiceVoucherError,
  InvoiceVoucherErrorCodes,
} from "./invoice-voucher-errors"
import {
  applyCancelledStatus,
  applyConfirmedStatus,
  applySubmittedStatus,
} from "./invoice-voucher-status"
import { isImmutableInvoiceVoucherStatus } from "./invoice-voucher-transition-policy"
import type {
  CancelInvoiceVoucherInput,
  ConfirmInvoiceVoucherInput,
  DeleteDraftInvoiceVoucherInput,
  InvoiceVoucherWithLines,
  SubmitInvoiceVoucherInput,
} from "./invoice-voucher-types"
import { assertCanSubmitInvoiceVoucher } from "./invoice-voucher-validation"

async function loadEntryOrThrow(
  tx: Prisma.TransactionClient,
  entryId: string,
  legalEntityCode: DocumentEntityCode
): Promise<InvoiceVoucherWithLines> {
  const { id } = entityScopedIdWhere(entryId, legalEntityCode)
  const entry = await tx.invoiceVoucher.findFirst({
    where: { id, legalEntityCode },
    include: { lines: true },
  })

  if (!entry) {
    throw new InvoiceVoucherError(
      "Invoice voucher not found",
      InvoiceVoucherErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  return entry
}

export async function submitInvoiceVoucher(
  input: SubmitInvoiceVoucherInput
): Promise<InvoiceVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  const submittedByStaffId = String(input.submittedByStaffId ?? "").trim()

  if (!entryId || !submittedByStaffId) {
    throw new InvoiceVoucherError(
      "entryId and submittedByStaffId are required",
      InvoiceVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<InvoiceVoucherWithLines> => {
    const entry = await loadEntryOrThrow(tx, entryId, legalEntityCode)
    await assertCanSubmitInvoiceVoucher(tx, entry)
    return applySubmittedStatus(tx, { entryId, submittedByStaffId })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

export async function confirmInvoiceVoucher(
  input: ConfirmInvoiceVoucherInput
): Promise<InvoiceVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  const confirmedByStaffId = String(input.confirmedByStaffId ?? "").trim()

  if (!entryId || !confirmedByStaffId) {
    throw new InvoiceVoucherError(
      "entryId and confirmedByStaffId are required",
      InvoiceVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<InvoiceVoucherWithLines> => {
    const entry = await loadEntryOrThrow(tx, entryId, legalEntityCode)

    if (isImmutableInvoiceVoucherStatus(entry.status)) {
      throw new InvoiceVoucherError(
        `Cannot confirm invoice voucher in status ${entry.status}`,
        InvoiceVoucherErrorCodes.IMMUTABLE_ENTRY
      )
    }

    if (entry.status !== "SUBMITTED") {
      throw new InvoiceVoucherError(
        `Only SUBMITTED invoice vouchers may be confirmed (status: ${entry.status})`,
        InvoiceVoucherErrorCodes.INVALID_TRANSITION
      )
    }

    return applyConfirmedStatus(tx, { entryId, confirmedByStaffId })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

export async function cancelInvoiceVoucher(
  input: CancelInvoiceVoucherInput
): Promise<InvoiceVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  const cancelledByStaffId = String(input.cancelledByStaffId ?? "").trim()

  if (!entryId || !cancelledByStaffId) {
    throw new InvoiceVoucherError(
      "entryId and cancelledByStaffId are required",
      InvoiceVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<InvoiceVoucherWithLines> => {
    await loadEntryOrThrow(tx, entryId, legalEntityCode)
    return applyCancelledStatus(tx, {
      entryId,
      cancelledByStaffId,
      cancelReason: input.cancelReason,
    })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

export async function deleteDraftInvoiceVoucher(
  input: DeleteDraftInvoiceVoucherInput
): Promise<void> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  if (!entryId) {
    throw new InvoiceVoucherError(
      "entryId is required",
      InvoiceVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<void> => {
    const entry = await loadEntryOrThrow(tx, entryId, legalEntityCode)

    if (isImmutableInvoiceVoucherStatus(entry.status)) {
      throw new InvoiceVoucherError(
        `Cannot delete invoice voucher in status ${entry.status}`,
        InvoiceVoucherErrorCodes.IMMUTABLE_ENTRY
      )
    }

    if (entry.status !== "DRAFT") {
      throw new InvoiceVoucherError(
        `Only DRAFT invoice vouchers may be deleted (status: ${entry.status})`,
        InvoiceVoucherErrorCodes.NOT_DRAFT
      )
    }

    await tx.invoiceVoucherLine.deleteMany({ where: { invoiceVoucherId: entryId } })
    await tx.invoiceVoucher.delete({ where: { id: entryId } })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
