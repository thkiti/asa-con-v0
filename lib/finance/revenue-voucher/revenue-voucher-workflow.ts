import type { Prisma } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { entityScopedIdWhere } from "@/lib/finance/voucher-entity-scope"
import { prisma } from "@/lib/shared/prisma"
import {
  RevenueVoucherError,
  RevenueVoucherErrorCodes,
} from "./revenue-voucher-errors"
import {
  applyCancelledStatus,
  applyConfirmedStatus,
  applySubmittedStatus,
} from "./revenue-voucher-status"
import { isImmutableRevenueVoucherStatus } from "./revenue-voucher-transition-policy"
import type {
  CancelRevenueVoucherInput,
  ConfirmRevenueVoucherInput,
  DeleteDraftRevenueVoucherInput,
  RevenueVoucherWithLines,
  SubmitRevenueVoucherInput,
} from "./revenue-voucher-types"
import { assertCanSubmitRevenueVoucher } from "./revenue-voucher-validation"

async function loadEntryOrThrow(
  tx: Prisma.TransactionClient,
  entryId: string,
  legalEntityCode: DocumentEntityCode
): Promise<RevenueVoucherWithLines> {
  const { id } = entityScopedIdWhere(entryId, legalEntityCode)
  const entry = await tx.revenueVoucher.findFirst({
    where: { id, legalEntityCode },
    include: { lines: true },
  })

  if (!entry) {
    throw new RevenueVoucherError(
      "Revenue voucher not found",
      RevenueVoucherErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  return entry
}

export async function submitRevenueVoucher(
  input: SubmitRevenueVoucherInput
): Promise<RevenueVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  const submittedByStaffId = String(input.submittedByStaffId ?? "").trim()

  if (!entryId || !submittedByStaffId) {
    throw new RevenueVoucherError(
      "entryId and submittedByStaffId are required",
      RevenueVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<RevenueVoucherWithLines> => {
    const entry = await loadEntryOrThrow(tx, entryId, legalEntityCode)
    await assertCanSubmitRevenueVoucher(tx, entry)
    return applySubmittedStatus(tx, { entryId, submittedByStaffId })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

export async function confirmRevenueVoucher(
  input: ConfirmRevenueVoucherInput
): Promise<RevenueVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  const confirmedByStaffId = String(input.confirmedByStaffId ?? "").trim()

  if (!entryId || !confirmedByStaffId) {
    throw new RevenueVoucherError(
      "entryId and confirmedByStaffId are required",
      RevenueVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<RevenueVoucherWithLines> => {
    const entry = await loadEntryOrThrow(tx, entryId, legalEntityCode)

    if (isImmutableRevenueVoucherStatus(entry.status)) {
      throw new RevenueVoucherError(
        `Cannot confirm Revenue voucher in status ${entry.status}`,
        RevenueVoucherErrorCodes.IMMUTABLE_ENTRY
      )
    }

    if (entry.status !== "SUBMITTED") {
      throw new RevenueVoucherError(
        `Only SUBMITTED Revenue vouchers may be confirmed (status: ${entry.status})`,
        RevenueVoucherErrorCodes.INVALID_TRANSITION
      )
    }

    return applyConfirmedStatus(tx, { entryId, confirmedByStaffId })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

export async function cancelRevenueVoucher(
  input: CancelRevenueVoucherInput
): Promise<RevenueVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  const cancelledByStaffId = String(input.cancelledByStaffId ?? "").trim()

  if (!entryId || !cancelledByStaffId) {
    throw new RevenueVoucherError(
      "entryId and cancelledByStaffId are required",
      RevenueVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<RevenueVoucherWithLines> => {
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

export async function deleteDraftRevenueVoucher(
  input: DeleteDraftRevenueVoucherInput
): Promise<void> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  if (!entryId) {
    throw new RevenueVoucherError(
      "entryId is required",
      RevenueVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<void> => {
    const entry = await loadEntryOrThrow(tx, entryId, legalEntityCode)

    if (isImmutableRevenueVoucherStatus(entry.status)) {
      throw new RevenueVoucherError(
        `Cannot delete Revenue voucher in status ${entry.status}`,
        RevenueVoucherErrorCodes.IMMUTABLE_ENTRY
      )
    }

    if (entry.status !== "DRAFT") {
      throw new RevenueVoucherError(
        `Only DRAFT Revenue vouchers may be deleted (status: ${entry.status})`,
        RevenueVoucherErrorCodes.NOT_DRAFT
      )
    }

    await tx.revenueVoucherLine.deleteMany({ where: { revenueVoucherId: entryId } })
    await tx.revenueVoucher.delete({ where: { id: entryId } })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
