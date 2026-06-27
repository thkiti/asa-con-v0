import type { Prisma } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { entityScopedIdWhere } from "@/lib/finance/voucher-entity-scope"
import { prisma } from "@/lib/shared/prisma"
import {
  PaymentVoucherError,
  PaymentVoucherErrorCodes,
} from "./payment-voucher-errors"
import {
  applyCancelledStatus,
  applyConfirmedStatus,
  applySubmittedStatus,
} from "./payment-voucher-status"
import { isImmutablePaymentVoucherStatus } from "./payment-voucher-transition-policy"
import type {
  CancelPaymentVoucherInput,
  ConfirmPaymentVoucherInput,
  DeleteDraftPaymentVoucherInput,
  PaymentVoucherWithLines,
  SubmitPaymentVoucherInput,
} from "./payment-voucher-types"
import { assertCanSubmitPaymentVoucher } from "./payment-voucher-validation"

async function loadEntryOrThrow(
  tx: Prisma.TransactionClient,
  entryId: string,
  legalEntityCode: DocumentEntityCode
): Promise<PaymentVoucherWithLines> {
  const { id } = entityScopedIdWhere(entryId, legalEntityCode)
  const entry = await tx.paymentVoucher.findFirst({
    where: { id, legalEntityCode },
    include: { lines: true },
  })

  if (!entry) {
    throw new PaymentVoucherError(
      "Payment voucher not found",
      PaymentVoucherErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  return entry
}

export async function submitPaymentVoucher(
  input: SubmitPaymentVoucherInput
): Promise<PaymentVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  const submittedByStaffId = String(input.submittedByStaffId ?? "").trim()

  if (!entryId || !submittedByStaffId) {
    throw new PaymentVoucherError(
      "entryId and submittedByStaffId are required",
      PaymentVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<PaymentVoucherWithLines> => {
    const entry = await loadEntryOrThrow(tx, entryId, legalEntityCode)
    await assertCanSubmitPaymentVoucher(tx, entry)
    return applySubmittedStatus(tx, { entryId, submittedByStaffId })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

export async function confirmPaymentVoucher(
  input: ConfirmPaymentVoucherInput
): Promise<PaymentVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  const confirmedByStaffId = String(input.confirmedByStaffId ?? "").trim()

  if (!entryId || !confirmedByStaffId) {
    throw new PaymentVoucherError(
      "entryId and confirmedByStaffId are required",
      PaymentVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<PaymentVoucherWithLines> => {
    const entry = await loadEntryOrThrow(tx, entryId, legalEntityCode)

    if (isImmutablePaymentVoucherStatus(entry.status)) {
      throw new PaymentVoucherError(
        `Cannot confirm payment voucher in status ${entry.status}`,
        PaymentVoucherErrorCodes.IMMUTABLE_ENTRY
      )
    }

    if (entry.status !== "SUBMITTED") {
      throw new PaymentVoucherError(
        `Only SUBMITTED payment vouchers may be confirmed (status: ${entry.status})`,
        PaymentVoucherErrorCodes.INVALID_TRANSITION
      )
    }

    return applyConfirmedStatus(tx, { entryId, confirmedByStaffId })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

export async function cancelPaymentVoucher(
  input: CancelPaymentVoucherInput
): Promise<PaymentVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  const cancelledByStaffId = String(input.cancelledByStaffId ?? "").trim()

  if (!entryId || !cancelledByStaffId) {
    throw new PaymentVoucherError(
      "entryId and cancelledByStaffId are required",
      PaymentVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<PaymentVoucherWithLines> => {
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

export async function deleteDraftPaymentVoucher(
  input: DeleteDraftPaymentVoucherInput
): Promise<void> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  if (!entryId) {
    throw new PaymentVoucherError(
      "entryId is required",
      PaymentVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<void> => {
    const entry = await loadEntryOrThrow(tx, entryId, legalEntityCode)

    if (isImmutablePaymentVoucherStatus(entry.status)) {
      throw new PaymentVoucherError(
        `Cannot delete payment voucher in status ${entry.status}`,
        PaymentVoucherErrorCodes.IMMUTABLE_ENTRY
      )
    }

    if (entry.status !== "DRAFT") {
      throw new PaymentVoucherError(
        `Only DRAFT payment vouchers may be deleted (status: ${entry.status})`,
        PaymentVoucherErrorCodes.NOT_DRAFT
      )
    }

    await tx.paymentVoucherLine.deleteMany({ where: { paymentVoucherId: entryId } })
    await tx.paymentVoucher.delete({ where: { id: entryId } })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
