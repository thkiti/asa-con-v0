import type { Prisma } from "@/generated/prisma/client"
import {
  PettyCashVoucherError,
  PettyCashVoucherErrorCodes,
} from "./petty-cash-voucher-errors"
import { assertPettyCashVoucherTransitionAllowed } from "./petty-cash-voucher-transition-policy"
import type {
  ApplyCancelledStatusInput,
  ApplyConfirmedStatusInput,
  ApplyPostedStatusInput,
  ApplySubmittedStatusInput,
  PettyCashVoucherWithLines,
} from "./petty-cash-voucher-types"

async function loadEntryWithLines(
  tx: Prisma.TransactionClient,
  entryId: string
): Promise<PettyCashVoucherWithLines | null> {
  return tx.pettyCashVoucher.findUnique({
    where: { id: entryId },
    include: { lines: true },
  })
}

export async function applySubmittedStatus(
  tx: Prisma.TransactionClient,
  input: ApplySubmittedStatusInput
): Promise<PettyCashVoucherWithLines> {
  const entry = await loadEntryWithLines(tx, input.entryId)
  if (!entry) {
    throw new PettyCashVoucherError(
      "Petty cash voucher not found",
      PettyCashVoucherErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  assertPettyCashVoucherTransitionAllowed({ fromStatus: entry.status, action: "SUBMIT" })

  const now = new Date()
  return tx.pettyCashVoucher.update({
    where: { id: input.entryId },
    data: {
      status: "SUBMITTED",
      submittedAt: now,
      submittedByStaffId: input.submittedByStaffId,
    },
    include: { lines: true },
  })
}

export async function applyConfirmedStatus(
  tx: Prisma.TransactionClient,
  input: ApplyConfirmedStatusInput
): Promise<PettyCashVoucherWithLines> {
  const entry = await loadEntryWithLines(tx, input.entryId)
  if (!entry) {
    throw new PettyCashVoucherError(
      "Petty cash voucher not found",
      PettyCashVoucherErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  assertPettyCashVoucherTransitionAllowed({ fromStatus: entry.status, action: "CONFIRM" })

  const now = new Date()
  return tx.pettyCashVoucher.update({
    where: { id: input.entryId },
    data: {
      status: "CONFIRMED",
      confirmedAt: now,
      confirmedByStaffId: input.confirmedByStaffId,
    },
    include: { lines: true },
  })
}

export async function applyPostedStatus(
  tx: Prisma.TransactionClient,
  input: ApplyPostedStatusInput
): Promise<PettyCashVoucherWithLines> {
  const entry = await loadEntryWithLines(tx, input.entryId)
  if (!entry) {
    throw new PettyCashVoucherError(
      "Petty cash voucher not found",
      PettyCashVoucherErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  assertPettyCashVoucherTransitionAllowed({ fromStatus: entry.status, action: "POST" })

  const now = new Date()
  return tx.pettyCashVoucher.update({
    where: { id: input.entryId },
    data: {
      status: "POSTED",
      postedAt: now,
      postedByStaffId: input.postedByStaffId,
      ...(input.postedVoucherId !== undefined
        ? { postedVoucherId: input.postedVoucherId }
        : {}),
      ...(input.postedJournalEntryId !== undefined
        ? { postedJournalEntryId: input.postedJournalEntryId }
        : {}),
    },
    include: { lines: true },
  })
}

export async function applyCancelledStatus(
  tx: Prisma.TransactionClient,
  input: ApplyCancelledStatusInput
): Promise<PettyCashVoucherWithLines> {
  const entry = await loadEntryWithLines(tx, input.entryId)
  if (!entry) {
    throw new PettyCashVoucherError(
      "Petty cash voucher not found",
      PettyCashVoucherErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  assertPettyCashVoucherTransitionAllowed({ fromStatus: entry.status, action: "CANCEL" })

  const now = new Date()
  return tx.pettyCashVoucher.update({
    where: { id: input.entryId },
    data: {
      status: "CANCELLED",
      cancelledAt: now,
      cancelledByStaffId: input.cancelledByStaffId,
      cancelReason: input.cancelReason ?? null,
    },
    include: { lines: true },
  })
}
