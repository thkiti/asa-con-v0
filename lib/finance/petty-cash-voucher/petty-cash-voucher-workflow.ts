import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import {
  PettyCashVoucherError,
  PettyCashVoucherErrorCodes,
} from "./petty-cash-voucher-errors"
import {
  applyCancelledStatus,
  applyConfirmedStatus,
  applySubmittedStatus,
} from "./petty-cash-voucher-status"
import { isImmutablePettyCashVoucherStatus } from "./petty-cash-voucher-transition-policy"
import type {
  CancelPettyCashVoucherInput,
  ConfirmPettyCashVoucherInput,
  DeleteDraftPettyCashVoucherInput,
  PettyCashVoucherWithLines,
  SubmitPettyCashVoucherInput,
} from "./petty-cash-voucher-types"
import { assertCanSubmitPettyCashVoucher } from "./petty-cash-voucher-validation"

async function loadEntryOrThrow(
  tx: Prisma.TransactionClient,
  entryId: string
): Promise<PettyCashVoucherWithLines> {
  const entry = await tx.pettyCashVoucher.findUnique({
    where: { id: entryId },
    include: { lines: true },
  })

  if (!entry) {
    throw new PettyCashVoucherError(
      "Petty cash voucher not found",
      PettyCashVoucherErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  return entry
}

export async function submitPettyCashVoucher(
  input: SubmitPettyCashVoucherInput
): Promise<PettyCashVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const submittedByStaffId = String(input.submittedByStaffId ?? "").trim()

  if (!entryId || !submittedByStaffId) {
    throw new PettyCashVoucherError(
      "entryId and submittedByStaffId are required",
      PettyCashVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<PettyCashVoucherWithLines> => {
    const entry = await loadEntryOrThrow(tx, entryId)
    await assertCanSubmitPettyCashVoucher(tx, entry)
    return applySubmittedStatus(tx, { entryId, submittedByStaffId })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

export async function confirmPettyCashVoucher(
  input: ConfirmPettyCashVoucherInput
): Promise<PettyCashVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const confirmedByStaffId = String(input.confirmedByStaffId ?? "").trim()

  if (!entryId || !confirmedByStaffId) {
    throw new PettyCashVoucherError(
      "entryId and confirmedByStaffId are required",
      PettyCashVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<PettyCashVoucherWithLines> => {
    const entry = await loadEntryOrThrow(tx, entryId)

    if (isImmutablePettyCashVoucherStatus(entry.status)) {
      throw new PettyCashVoucherError(
        `Cannot confirm Petty cash voucher in status ${entry.status}`,
        PettyCashVoucherErrorCodes.IMMUTABLE_ENTRY
      )
    }

    if (entry.status !== "SUBMITTED") {
      throw new PettyCashVoucherError(
        `Only SUBMITTED Petty cash vouchers may be confirmed (status: ${entry.status})`,
        PettyCashVoucherErrorCodes.INVALID_TRANSITION
      )
    }

    return applyConfirmedStatus(tx, { entryId, confirmedByStaffId })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

export async function cancelPettyCashVoucher(
  input: CancelPettyCashVoucherInput
): Promise<PettyCashVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const cancelledByStaffId = String(input.cancelledByStaffId ?? "").trim()

  if (!entryId || !cancelledByStaffId) {
    throw new PettyCashVoucherError(
      "entryId and cancelledByStaffId are required",
      PettyCashVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<PettyCashVoucherWithLines> =>
    applyCancelledStatus(tx, {
      entryId,
      cancelledByStaffId,
      cancelReason: input.cancelReason,
    })

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

export async function deleteDraftPettyCashVoucher(
  input: DeleteDraftPettyCashVoucherInput
): Promise<void> {
  const entryId = String(input.entryId ?? "").trim()
  if (!entryId) {
    throw new PettyCashVoucherError(
      "entryId is required",
      PettyCashVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<void> => {
    const entry = await loadEntryOrThrow(tx, entryId)

    if (isImmutablePettyCashVoucherStatus(entry.status)) {
      throw new PettyCashVoucherError(
        `Cannot delete Petty cash voucher in status ${entry.status}`,
        PettyCashVoucherErrorCodes.IMMUTABLE_ENTRY
      )
    }

    if (entry.status !== "DRAFT") {
      throw new PettyCashVoucherError(
        `Only DRAFT Petty cash vouchers may be deleted (status: ${entry.status})`,
        PettyCashVoucherErrorCodes.NOT_DRAFT
      )
    }

    await tx.pettyCashVoucherLine.deleteMany({ where: { pettyCashVoucherId: entryId } })
    await tx.pettyCashVoucher.delete({ where: { id: entryId } })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
