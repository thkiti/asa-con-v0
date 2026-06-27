import type { Prisma } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { entityScopedIdWhere } from "@/lib/finance/voucher-entity-scope"
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
  entryId: string,
  legalEntityCode: DocumentEntityCode
): Promise<PettyCashVoucherWithLines> {
  const { id } = entityScopedIdWhere(entryId, legalEntityCode)
  const entry = await tx.pettyCashVoucher.findFirst({
    where: { id, legalEntityCode },
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
  const legalEntityCode = input.legalEntityCode
  const submittedByStaffId = String(input.submittedByStaffId ?? "").trim()

  if (!entryId || !submittedByStaffId) {
    throw new PettyCashVoucherError(
      "entryId and submittedByStaffId are required",
      PettyCashVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<PettyCashVoucherWithLines> => {
    const entry = await loadEntryOrThrow(tx, entryId, legalEntityCode)
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
  const legalEntityCode = input.legalEntityCode
  const confirmedByStaffId = String(input.confirmedByStaffId ?? "").trim()

  if (!entryId || !confirmedByStaffId) {
    throw new PettyCashVoucherError(
      "entryId and confirmedByStaffId are required",
      PettyCashVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<PettyCashVoucherWithLines> => {
    const entry = await loadEntryOrThrow(tx, entryId, legalEntityCode)

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
  const legalEntityCode = input.legalEntityCode
  const cancelledByStaffId = String(input.cancelledByStaffId ?? "").trim()

  if (!entryId || !cancelledByStaffId) {
    throw new PettyCashVoucherError(
      "entryId and cancelledByStaffId are required",
      PettyCashVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<PettyCashVoucherWithLines> => {
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

export async function deleteDraftPettyCashVoucher(
  input: DeleteDraftPettyCashVoucherInput
): Promise<void> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  if (!entryId) {
    throw new PettyCashVoucherError(
      "entryId is required",
      PettyCashVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<void> => {
    const entry = await loadEntryOrThrow(tx, entryId, legalEntityCode)

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
