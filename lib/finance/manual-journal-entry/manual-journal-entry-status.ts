import type { Prisma } from "@/generated/prisma/client"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "./manual-journal-entry-errors"
import { assertTransitionAllowed } from "./manual-journal-entry-transition-policy"
import type {
  ApplyCancelledStatusInput,
  ApplyConfirmedStatusInput,
  ApplyPdfSnapshotInput,
  ApplyPostedStatusInput,
  ApplySubmittedStatusInput,
  ManualJournalEntryWithLines,
} from "./manual-journal-entry-types"

async function loadEntryWithLines(
  tx: Prisma.TransactionClient,
  entryId: string
): Promise<ManualJournalEntryWithLines | null> {
  return tx.manualJournalEntry.findUnique({
    where: { id: entryId },
    include: { lines: true },
  })
}

/**
 * Sole module allowed to mutate ManualJournalEntry.status and workflow audit fields.
 */
export async function applySubmittedStatus(
  tx: Prisma.TransactionClient,
  input: ApplySubmittedStatusInput
): Promise<ManualJournalEntryWithLines> {
  const entry = await loadEntryWithLines(tx, input.entryId)
  if (!entry) {
    throw new ManualJournalEntryError(
      "Manual journal entry not found",
      ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  assertTransitionAllowed({ fromStatus: entry.status, action: "SUBMIT" })

  const now = new Date()
  return tx.manualJournalEntry.update({
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
): Promise<ManualJournalEntryWithLines> {
  const entry = await loadEntryWithLines(tx, input.entryId)
  if (!entry) {
    throw new ManualJournalEntryError(
      "Manual journal entry not found",
      ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  assertTransitionAllowed({ fromStatus: entry.status, action: "CONFIRM" })

  const now = new Date()
  return tx.manualJournalEntry.update({
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
): Promise<ManualJournalEntryWithLines> {
  const entry = await loadEntryWithLines(tx, input.entryId)
  if (!entry) {
    throw new ManualJournalEntryError(
      "Manual journal entry not found",
      ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  assertTransitionAllowed({ fromStatus: entry.status, action: "POST" })

  const now = new Date()
  return tx.manualJournalEntry.update({
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

/**
 * Replace archived PDF metadata after explicit repair regeneration.
 * Updates pdfPath / pdfBlobUrl / pdfGeneratedAt only — never workflow or accounting fields.
 */
export async function applyPdfSnapshotRepair(
  tx: Prisma.TransactionClient,
  input: ApplyPdfSnapshotInput
): Promise<ManualJournalEntryWithLines> {
  const entry = await loadEntryWithLines(tx, input.entryId)
  if (!entry) {
    throw new ManualJournalEntryError(
      "Manual journal entry not found",
      ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  if (entry.status !== "POSTED") {
    throw new ManualJournalEntryError(
      "PDF snapshot repair is only allowed for POSTED entries",
      ManualJournalEntryErrorCodes.INVALID_TRANSITION,
      409
    )
  }

  const existingPdfPath = String(entry.pdfPath ?? "").trim()
  const existingBlobUrl = String(entry.pdfBlobUrl ?? "").trim()
  if (!existingPdfPath && !existingBlobUrl) {
    throw new ManualJournalEntryError(
      "PDF snapshot repair requires an existing archived PDF snapshot",
      ManualJournalEntryErrorCodes.PDF_MISSING,
      409
    )
  }

  return tx.manualJournalEntry.update({
    where: { id: input.entryId },
    data: {
      pdfPath: input.pdfPath,
      pdfGeneratedAt: input.pdfGeneratedAt,
      pdfBlobUrl: input.pdfBlobUrl ?? null,
    },
    include: { lines: true },
  })
}

/**
 * Remove archived PDF metadata after explicit admin repair delete.
 * Clears pdfPath / pdfBlobUrl / pdfGeneratedAt only — never workflow or accounting fields.
 */
export async function applyPdfSnapshotClear(
  tx: Prisma.TransactionClient,
  input: { entryId: string }
): Promise<ManualJournalEntryWithLines> {
  const entry = await loadEntryWithLines(tx, input.entryId)
  if (!entry) {
    throw new ManualJournalEntryError(
      "Manual journal entry not found",
      ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  if (entry.status !== "POSTED") {
    throw new ManualJournalEntryError(
      "PDF snapshot delete is only allowed for POSTED entries",
      ManualJournalEntryErrorCodes.INVALID_TRANSITION,
      409
    )
  }

  const existingPdfPath = String(entry.pdfPath ?? "").trim()
  const existingBlobUrl = String(entry.pdfBlobUrl ?? "").trim()
  if (!existingPdfPath && !existingBlobUrl) {
    throw new ManualJournalEntryError(
      "No archived PDF snapshot exists to delete",
      ManualJournalEntryErrorCodes.PDF_MISSING,
      409
    )
  }

  return tx.manualJournalEntry.update({
    where: { id: input.entryId },
    data: {
      pdfPath: null,
      pdfBlobUrl: null,
      pdfGeneratedAt: null,
    },
    include: { lines: true },
  })
}

/**
 * Sole writer for pdfPath / pdfGeneratedAt. Idempotent when snapshot already attached.
 */
export async function applyPdfSnapshot(
  tx: Prisma.TransactionClient,
  input: ApplyPdfSnapshotInput
): Promise<ManualJournalEntryWithLines> {
  const entry = await loadEntryWithLines(tx, input.entryId)
  if (!entry) {
    throw new ManualJournalEntryError(
      "Manual journal entry not found",
      ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  if (entry.status !== "POSTED") {
    throw new ManualJournalEntryError(
      "PDF snapshot is only allowed for POSTED entries",
      ManualJournalEntryErrorCodes.INVALID_TRANSITION
    )
  }

  if (entry.pdfPath) {
    return entry
  }

  try {
    return await tx.manualJournalEntry.update({
      where: { id: input.entryId, pdfPath: null },
      data: {
        pdfPath: input.pdfPath,
        pdfGeneratedAt: input.pdfGeneratedAt,
        pdfBlobUrl: input.pdfBlobUrl ?? null,
      },
      include: { lines: true },
    })
  } catch (err: unknown) {
    const existing = await loadEntryWithLines(tx, input.entryId)
    if (existing?.pdfPath) {
      return existing
    }
    throw err
  }
}

export async function applyCancelledStatus(
  tx: Prisma.TransactionClient,
  input: ApplyCancelledStatusInput
): Promise<ManualJournalEntryWithLines> {
  const entry = await loadEntryWithLines(tx, input.entryId)
  if (!entry) {
    throw new ManualJournalEntryError(
      "Manual journal entry not found",
      ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  assertTransitionAllowed({ fromStatus: entry.status, action: "CANCEL" })

  const now = new Date()
  return tx.manualJournalEntry.update({
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
