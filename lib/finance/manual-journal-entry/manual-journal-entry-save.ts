import type { Prisma } from "@/generated/prisma/client"
import { entityScopedIdWhere } from "@/lib/finance/voucher-entity-scope"
import { createWithAllocatedEntryNoRetry } from "@/lib/finance/document-number-allocation"
import { prisma } from "@/lib/shared/prisma"
import {
  allocateManualJournalEntryNo,
} from "./manual-journal-entry-allocate-no"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
  formatManualJournalEntryAllocationFailedMessage,
} from "./manual-journal-entry-errors"
import type {
  CreateManualJournalEntryDraftInput,
  ManualJournalEntryWithLines,
  UpdateManualJournalEntryDraftInput,
} from "./manual-journal-entry-types"
import {
  assertDraftEditable,
  parseManualJournalEntryDate,
  resolveManualJournalEntryLines,
} from "./manual-journal-entry-validation"

async function replaceManualJournalEntryLines(
  tx: Prisma.TransactionClient,
  entryId: string,
  lines: Awaited<ReturnType<typeof resolveManualJournalEntryLines>>
): Promise<void> {
  await tx.manualJournalEntryLine.deleteMany({
    where: { manualJournalEntryId: entryId },
  })

  if (lines.length > 0) {
    await tx.manualJournalEntryLine.createMany({
      data: lines.map((line) => ({
        manualJournalEntryId: entryId,
        lineNo: line.lineNo,
        glAccountId: line.glAccountId,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo,
      })),
    })
  }
}

/**
 * Create a DRAFT manual journal entry with allocated entryNo and validated lines.
 * Does not create voucher or journal rows.
 */
export async function createManualJournalEntryDraft(
  input: CreateManualJournalEntryDraftInput
): Promise<ManualJournalEntryWithLines> {
  const branchId = String(input.branchId ?? "").trim()
  const legalEntityCode = String(input.legalEntityCode ?? "").trim()
  const createdByStaffId = String(input.createdByStaffId ?? "").trim()
  const entryDate = parseManualJournalEntryDate(input.entryDate)

  if (!branchId) {
    throw new ManualJournalEntryError(
      "branchId is required",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }
  if (!legalEntityCode) {
    throw new ManualJournalEntryError(
      "legalEntityCode is required",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }
  if (!createdByStaffId) {
    throw new ManualJournalEntryError(
      "createdByStaffId is required",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<ManualJournalEntryWithLines> => {
    const lines = await resolveManualJournalEntryLines(tx, input.lines)

    return createWithAllocatedEntryNoRetry({
      allocate: () =>
        allocateManualJournalEntryNo(tx, {
          legalEntityCode,
          entryType: input.entryType,
          entryDate,
        }),
      create: (entryNo) =>
        tx.manualJournalEntry.create({
          data: {
            entryNo,
            entryType: input.entryType,
            status: "DRAFT",
            branchId,
            legalEntityCode,
            entryDate,
            description: input.description ?? null,
            refNo: input.refNo ?? null,
            createdByStaffId,
            lines: {
              create: lines.map((line) => ({
                lineNo: line.lineNo,
                glAccountId: line.glAccountId,
                debit: line.debit,
                credit: line.credit,
                memo: line.memo,
              })),
            },
          },
          include: { lines: true },
        }),
      allocationFailedError: () =>
        new ManualJournalEntryError(
          formatManualJournalEntryAllocationFailedMessage(legalEntityCode),
          ManualJournalEntryErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED
        ),
    })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

/**
 * Update a DRAFT manual journal entry header and replace lines atomically.
 */
export async function updateManualJournalEntryDraft(
  input: UpdateManualJournalEntryDraftInput
): Promise<ManualJournalEntryWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  if (!entryId) {
    throw new ManualJournalEntryError(
      "entryId is required",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<ManualJournalEntryWithLines> => {
    const { id } = entityScopedIdWhere(entryId, legalEntityCode)
    const existing = await tx.manualJournalEntry.findFirst({
      where: { id, legalEntityCode },
      select: { id: true, status: true },
    })

    if (!existing) {
      throw new ManualJournalEntryError(
        "Manual journal entry not found",
        ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
        404
      )
    }

    assertDraftEditable(existing.status)

    const lines = await resolveManualJournalEntryLines(tx, input.lines)

    const headerData: {
      entryDate?: Date
      description?: string | null
      refNo?: string | null
    } = {}

    if (input.entryDate !== undefined) {
      headerData.entryDate = parseManualJournalEntryDate(input.entryDate)
    }
    if (input.description !== undefined) {
      headerData.description = input.description ?? null
    }
    if (input.refNo !== undefined) {
      headerData.refNo = input.refNo ?? null
    }

    if (Object.keys(headerData).length > 0) {
      await tx.manualJournalEntry.update({
        where: { id: entryId },
        data: headerData,
      })
    }

    await replaceManualJournalEntryLines(tx, entryId, lines)

    const updated = await tx.manualJournalEntry.findUnique({
      where: { id: entryId },
      include: { lines: { orderBy: { lineNo: "asc" } } },
    })

    if (!updated) {
      throw new ManualJournalEntryError(
        "Manual journal entry not found",
        ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
        404
      )
    }

    return updated
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
