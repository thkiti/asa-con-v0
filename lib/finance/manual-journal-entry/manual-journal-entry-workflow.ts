import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "./manual-journal-entry-errors"
import {
  applyCancelledStatus,
  applyConfirmedStatus,
  applySubmittedStatus,
} from "./manual-journal-entry-status"
import { isImmutableStatus } from "./manual-journal-entry-transition-policy"
import type {
  CancelManualJournalEntryInput,
  ConfirmManualJournalEntryInput,
  DeleteDraftManualJournalEntryInput,
  ManualJournalEntryWithLines,
  SubmitManualJournalEntryInput,
} from "./manual-journal-entry-types"
import { assertCanSubmitManualJournalEntry } from "./manual-journal-entry-validation"

async function loadEntryOrThrow(
  tx: Prisma.TransactionClient,
  entryId: string
): Promise<ManualJournalEntryWithLines> {
  const entry = await tx.manualJournalEntry.findUnique({
    where: { id: entryId },
    include: { lines: true },
  })

  if (!entry) {
    throw new ManualJournalEntryError(
      "Manual journal entry not found",
      ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  return entry
}

/**
 * DRAFT → SUBMITTED. Validates balanced lines; no voucher or journal side effects.
 */
export async function submitManualJournalEntry(
  input: SubmitManualJournalEntryInput
): Promise<ManualJournalEntryWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const submittedByStaffId = String(input.submittedByStaffId ?? "").trim()

  if (!entryId) {
    throw new ManualJournalEntryError(
      "entryId is required",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }
  if (!submittedByStaffId) {
    throw new ManualJournalEntryError(
      "submittedByStaffId is required",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<ManualJournalEntryWithLines> => {
    const entry = await loadEntryOrThrow(tx, entryId)
    await assertCanSubmitManualJournalEntry(tx, entry)
    return applySubmittedStatus(tx, { entryId, submittedByStaffId })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

/**
 * SUBMITTED → CONFIRMED. No voucher or journal side effects.
 */
export async function confirmManualJournalEntry(
  input: ConfirmManualJournalEntryInput
): Promise<ManualJournalEntryWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const confirmedByStaffId = String(input.confirmedByStaffId ?? "").trim()

  if (!entryId) {
    throw new ManualJournalEntryError(
      "entryId is required",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }
  if (!confirmedByStaffId) {
    throw new ManualJournalEntryError(
      "confirmedByStaffId is required",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<ManualJournalEntryWithLines> => {
    const entry = await loadEntryOrThrow(tx, entryId)

    if (isImmutableStatus(entry.status)) {
      throw new ManualJournalEntryError(
        `Cannot confirm entry in status ${entry.status}`,
        ManualJournalEntryErrorCodes.IMMUTABLE_ENTRY
      )
    }

    if (entry.status !== "SUBMITTED") {
      throw new ManualJournalEntryError(
        `Only SUBMITTED entries may be confirmed (status: ${entry.status})`,
        ManualJournalEntryErrorCodes.INVALID_TRANSITION
      )
    }

    return applyConfirmedStatus(tx, { entryId, confirmedByStaffId })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

/**
 * SUBMITTED or CONFIRMED → CANCELLED. No voucher or journal side effects.
 */
export async function cancelManualJournalEntry(
  input: CancelManualJournalEntryInput
): Promise<ManualJournalEntryWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const cancelledByStaffId = String(input.cancelledByStaffId ?? "").trim()

  if (!entryId) {
    throw new ManualJournalEntryError(
      "entryId is required",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }
  if (!cancelledByStaffId) {
    throw new ManualJournalEntryError(
      "cancelledByStaffId is required",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<ManualJournalEntryWithLines> =>
    applyCancelledStatus(tx, {
      entryId,
      cancelledByStaffId,
      cancelReason: input.cancelReason,
    })

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

/**
 * Hard-delete DRAFT entry and lines. No voucher or journal side effects.
 */
export async function deleteDraftManualJournalEntry(
  input: DeleteDraftManualJournalEntryInput
): Promise<void> {
  const entryId = String(input.entryId ?? "").trim()
  if (!entryId) {
    throw new ManualJournalEntryError(
      "entryId is required",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<void> => {
    const entry = await loadEntryOrThrow(tx, entryId)

    if (isImmutableStatus(entry.status)) {
      throw new ManualJournalEntryError(
        `Cannot delete entry in status ${entry.status}`,
        ManualJournalEntryErrorCodes.IMMUTABLE_ENTRY
      )
    }

    if (entry.status !== "DRAFT") {
      throw new ManualJournalEntryError(
        `Only DRAFT entries may be deleted (status: ${entry.status})`,
        ManualJournalEntryErrorCodes.NOT_DRAFT
      )
    }

    await tx.manualJournalEntryLine.deleteMany({
      where: { manualJournalEntryId: entryId },
    })
    await tx.manualJournalEntry.delete({ where: { id: entryId } })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
