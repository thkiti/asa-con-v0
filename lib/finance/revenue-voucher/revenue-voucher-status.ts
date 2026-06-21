import type { Prisma } from "@/generated/prisma/client"
import {
  RevenueVoucherError,
  RevenueVoucherErrorCodes,
} from "./revenue-voucher-errors"
import { assertRevenueVoucherTransitionAllowed } from "./revenue-voucher-transition-policy"
import type {
  ApplyCancelledStatusInput,
  ApplyConfirmedStatusInput,
  ApplyPostedStatusInput,
  ApplySubmittedStatusInput,
  RevenueVoucherWithLines,
} from "./revenue-voucher-types"

async function loadEntryWithLines(
  tx: Prisma.TransactionClient,
  entryId: string
): Promise<RevenueVoucherWithLines | null> {
  return tx.revenueVoucher.findUnique({
    where: { id: entryId },
    include: { lines: true },
  })
}

export async function applySubmittedStatus(
  tx: Prisma.TransactionClient,
  input: ApplySubmittedStatusInput
): Promise<RevenueVoucherWithLines> {
  const entry = await loadEntryWithLines(tx, input.entryId)
  if (!entry) {
    throw new RevenueVoucherError(
      "Revenue voucher not found",
      RevenueVoucherErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  assertRevenueVoucherTransitionAllowed({ fromStatus: entry.status, action: "SUBMIT" })

  const now = new Date()
  return tx.revenueVoucher.update({
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
): Promise<RevenueVoucherWithLines> {
  const entry = await loadEntryWithLines(tx, input.entryId)
  if (!entry) {
    throw new RevenueVoucherError(
      "Revenue voucher not found",
      RevenueVoucherErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  assertRevenueVoucherTransitionAllowed({ fromStatus: entry.status, action: "CONFIRM" })

  const now = new Date()
  return tx.revenueVoucher.update({
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
): Promise<RevenueVoucherWithLines> {
  const entry = await loadEntryWithLines(tx, input.entryId)
  if (!entry) {
    throw new RevenueVoucherError(
      "Revenue voucher not found",
      RevenueVoucherErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  assertRevenueVoucherTransitionAllowed({ fromStatus: entry.status, action: "POST" })

  const now = new Date()
  return tx.revenueVoucher.update({
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
): Promise<RevenueVoucherWithLines> {
  const entry = await loadEntryWithLines(tx, input.entryId)
  if (!entry) {
    throw new RevenueVoucherError(
      "Revenue voucher not found",
      RevenueVoucherErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  assertRevenueVoucherTransitionAllowed({ fromStatus: entry.status, action: "CANCEL" })

  const now = new Date()
  return tx.revenueVoucher.update({
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
